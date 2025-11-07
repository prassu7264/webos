import {
  AfterViewInit,
  Component,
  HostListener,
  OnDestroy,
  OnInit
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { clienturl } from '../api-base';
import { DeviceInfoService } from '../_core/services/device-info.service';
import { AuthService } from '../_core/services/auth.service';
import { ToastService } from '../_core/services/toast.service';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

const BASE_API = clienturl.WEB_URL();

export class MyErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: any, form: any): boolean {
    const isSubmitted = form && form.submitted;
    return !!(control && control.invalid && (control.dirty || control.touched || isSubmitted));
  }
}

declare var QRCode: any;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
  deviceForm!: FormGroup;
  deviceUID: string | null = null;
  matcher = new MyErrorStateMatcher();

  isVideoPlayed: boolean = sessionStorage.getItem("isVideoPlayed") === "true";
  isOpenSwalAlert = false;
  type: string | null = null;
  text: string | null = null;
  isExistedCalled = false;
  isAnyPopped = false;
  isLoggedin = false;
  version = clienturl.CURRENT_VERSION();
  contact = "Lumocast Digital Signage Pvt Ltd | Support@Cansignage.Com | +91 91523 98498";

  private uidSub: any;
  private checkDeviceAndNavigateInterval: any;
  private dialogCheckInterval: any;
  private isChecking = false;

  constructor(
    private deviceInfoService: DeviceInfoService,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService,
    private fb: FormBuilder,
    private matDialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.deviceForm = this.fb.group({
      deviceCode: ['', [Validators.required, Validators.pattern(/^IQW[0-9]+$/i)]]
    });

    const savedUsername = localStorage.getItem('username') || 'IQW0000041';
    this.deviceForm.get('deviceCode')?.setValue(savedUsername);

    // ✅ Subscribe to device UID changes
    this.uidSub = this.deviceInfoService.deviceUID$.subscribe(uid => {
      if (uid) {
        this.deviceUID = uid;
        console.log("Device UID:", uid);
        this.generateQRCode(uid);
      }
    });

    // ✅ Start periodic UI checks for dialogs
    this.dialogCheckInterval = setInterval(() => {
      this.isAnyPopped = this.matDialog.openDialogs.length > 0;
      if (this.isAnyPopped || this.isLoggedin) {
        this.deviceForm.get('deviceCode')?.disable({ emitEvent: false });
      } else {
        this.deviceForm.get('deviceCode')?.enable({ emitEvent: false });
      }
    }, 2000);

    // ✅ Start device verification loop after video played
    if (this.isVideoPlayed) {
      this.startDeviceCheckInterval();
    }
  }

  ngAfterViewInit(): void {
    const video: HTMLVideoElement | null = document.getElementById("launchervideo") as HTMLVideoElement;
    if (!video) return;

    video.muted = true;
    video.addEventListener("canplay", () => {
      console.log("Video ready → autoplaying");
      video.play().then(() => {
        video.muted = false;
      }).catch(err => console.warn("Autoplay blocked:", err));
    });

    video.addEventListener("ended", () => {
      console.log("Video ended");
      setTimeout(() => {
        this.isVideoPlayed = true;
        sessionStorage.setItem("isVideoPlayed", "true");
        this.startDeviceCheckInterval();
      }, 1000);
    });
  }

  ngOnDestroy(): void {
    if (this.uidSub) this.uidSub.unsubscribe();
    if (this.dialogCheckInterval) clearInterval(this.dialogCheckInterval);
    if (this.checkDeviceAndNavigateInterval) clearInterval(this.checkDeviceAndNavigateInterval);
  }

  // 🔁 Start periodic verification
  private startDeviceCheckInterval(): void {
    if (this.checkDeviceAndNavigateInterval) return; // prevent duplicates

    this.checkDeviceAndNavigate(); // first immediate check
    this.checkDeviceAndNavigateInterval = setInterval(() => {
      this.checkDeviceAndNavigate();
    }, 10000);
  }

  // ✅ Main Device Verification Logic
  private checkDeviceAndNavigate(): void {
    if (this.isChecking || !this.deviceUID) return;
    this.isChecking = true;

    this.authService.isExistedDevice(this.deviceUID).subscribe({
      next: (res: any) => {
        if (res?.status === "success") {
          const { client_status, device_status, isexpired } = res;
          sessionStorage.setItem("device", JSON.stringify(res));
          sessionStorage.setItem("username", res.username);
          this.isLoggedin = true;

          if (client_status && device_status && !isexpired) {
            if (!this.isExistedCalled) {
              this.toastService.success("Device verified successfully!!");
              this.isExistedCalled = true;
            }
            clearInterval(this.checkDeviceAndNavigateInterval);
            this.checkDeviceAndNavigateInterval = null;
            this.router.navigate(['/player'], { replaceUrl: true });
          } else {
            this.isOpenSwalAlert = true;
            if (!client_status) {
              this.type = "Approval Pending...!";
              this.text = "Please wait until your profile is approved by admin.";
            } else if (!device_status) {
              this.type = "Approval Pending...!";
              this.text = "Please wait until your device is approved by admin.";
            } else if (isexpired) {
              this.type = "Subscription Expired...!";
              this.text = "Subscription expired. Please contact admin.";
            }
            sessionStorage.setItem("isLogin", "true");
          }
        } else {
          this.isOpenSwalAlert = false;
          if (!this.isExistedCalled) {
            this.toastService.error(res?.message || "Device verification failed!!");
            this.isExistedCalled = true;
          }
          this.isLoggedin = false;
          sessionStorage.setItem("isLogin", "false");
        }
      },
      error: err => {
        console.error("Device check failed:", err);
      },
      complete: () => {
        this.isChecking = false;
      }
    });
  }

  private generateQRCode(uid: string): void {
    const qrcodeEl = document.getElementById("qrcode");
    if (!qrcodeEl) return;
    qrcodeEl.innerHTML = ""; // clear previous code

    new QRCode(qrcodeEl, {
      text: `${BASE_API}#/iqworld/digitalsignage/device/registrationform/${uid}`,
      width: 430,
      height: 430,
      correctLevel: QRCode.CorrectLevel.H
    });
  }

  toUppercase(event: any): void {
    const value = event.target.value.toUpperCase();
    this.deviceForm.get('deviceCode')?.setValue(value, { emitEvent: false });
  }

  submit(): void {
    if (!this.deviceForm.valid || !this.deviceUID) {
      this.toastService.info("Invalid form");
      return;
    }

    const code = this.deviceForm.value.deviceCode;
    this.authService.signup(code, this.deviceUID).subscribe((res: any) => {
      if (res?.status === 'Failed') {
        this.toastService.error(res.message);
      } else {
        this.toastService.success(res.message);
        this.isExistedCalled = false;
        this.checkDeviceAndNavigate();
      }
    });
  }
}
