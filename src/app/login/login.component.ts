import { AfterViewInit, Component, HostListener, OnInit } from '@angular/core';
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
export class LoginComponent implements OnInit, AfterViewInit {
	deviceForm!: FormGroup;
	deviceUID: string | null = null;
	isVideoPlayed: any = sessionStorage.getItem("isVideoPlayed") || false;
	matcher = new MyErrorStateMatcher();
	isOpenSwalAlert: boolean = false;
	type: any;
	text: any;
	isExistedCalled = false;
	isAnypopped = false;
	version = clienturl.CURRENT_VERSION();
	contact: any = "Lumocast Digital Signage Pvt Ltd | Support@Cansignage.Com | +91 91523 98498";

	constructor(
		private deviceInfoService: DeviceInfoService,
		private authService: AuthService,
		private router: Router,
		private toastService: ToastService,
		private fb: FormBuilder,
		private dialog: MatDialog
	) { }

	ngOnInit(): void {
		this.deviceForm = this.fb.group({
			deviceCode: ['', [Validators.required, Validators.pattern(/^IQW[0-9]+$/i)]]
		});

		let username = localStorage.getItem('username') || "IQW00000";
		if (username) {
			this.deviceForm.get('deviceCode')?.setValue(username);
		}

		this.deviceInfoService.deviceUID$.subscribe(uid => {
			if (uid) {
				this.deviceUID = uid;
				this.generateQRCode(uid);
			}
		});

		if (this.isVideoPlayed) {
			this.checkDeviceAndNavigate();
			setInterval(() => this.checkDeviceAndNavigate(), 1000);
		}
	}

	ngAfterViewInit(): void {
		const video: HTMLVideoElement | null = document.getElementById("launchervideo") as HTMLVideoElement;
		if (!video) return;

		video.addEventListener("canplay", () => {
			video.play().catch(err => console.warn("Autoplay blocked:", err));
		});

		video.addEventListener("ended", () => {
			setTimeout(() => {
				this.isVideoPlayed = true;
				sessionStorage.setItem("isVideoPlayed", this.isVideoPlayed);
			}, 1000);
			this.checkDeviceAndNavigate();
		});
	}

	private checkDeviceAndNavigate(): void {
		if (this.dialog.openDialogs.length > 0) {
			this.isAnypopped = true;
			this.deviceForm.get('deviceCode')?.disable();
		} else {
			this.isAnypopped = false;
			this.deviceForm.get('deviceCode')?.enable();
		}


		if (!this.deviceUID) return;

		this.authService.isExistedDevice(this.deviceUID).subscribe((res: any) => {
			if (res?.status === "success") {
				const { client_status, device_status, isexpired } = res;
				if (client_status && device_status && !isexpired) {
					sessionStorage.setItem("device", JSON.stringify(res));
					sessionStorage.setItem("username", res.username);
					if (!this.isExistedCalled) {
						this.toastService.success("Device verified successfully!!");
						this.isExistedCalled = true;
					}
					this.router.navigate(['player']);
				} else {
					this.type = !client_status
						? "Approval Pending...!"
						: isexpired
							? "Subscription Expired...!"
							: "Approval Pending...!";
					this.text = !client_status
						? "Please wait until your profile is approved by admin."
						: isexpired
							? "Subscription expired Please contact admin."
							: "Please wait until your device is approved by admin.";
					this.isOpenSwalAlert = true;
				}
			} else {
				this.isOpenSwalAlert = false;
				if (!this.isExistedCalled) {
					this.toastService.error(res?.message || "Device verification failed!!");
					this.isExistedCalled = true;
				}
			}
		});
	}

	private generateQRCode(uid: string): void {
		const qrcodeEl = document.getElementById("qrcode");
		if (!qrcodeEl) return;

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
			this.toastService.info('Invalid form');
			return;
		}

		const code = this.deviceForm.value.deviceCode;
		this.authService.signup(code, this.deviceUID).subscribe((res: any) => {
			if (res?.status === 'Failed') {
				this.toastService.error(res.message);
			} else {
				this.toastService.success(res.message);
				this.checkDeviceAndNavigate();
				this.isExistedCalled = false;
			}
		});
	}

}
