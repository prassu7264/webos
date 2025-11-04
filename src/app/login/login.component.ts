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
	pollInterval: any;
	isExistedCalled = false;
	isNewRegistration: boolean = false;
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

		let username = localStorage.getItem('username') || "";
		if (username) {
			this.deviceForm.get('deviceCode')?.setValue(username);
		}

		this.deviceInfoService.deviceUID$.subscribe(uid => {
			if (uid) {
				this.deviceUID = uid;
				this.generateQRCode(uid);

				//  Ensure QR registration behaves same as manual registration
				this.isNewRegistration = true;

				// Trigger approval check immediately after QR scan
				this.isExistedCalled = false;   // reset so popup will show
				// this.checkDeviceAndNavigate();
			}
		});


		// Start polling only after video played or QR activated
		if (this.isVideoPlayed) {
			this.startPolling();
		}
	}

	startPolling() {
		if (this.pollInterval) clearInterval(this.pollInterval);

		this.checkDeviceAndNavigate();
		this.pollInterval = setInterval(() => this.checkDeviceAndNavigate(), 2000);
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
			this.startPolling(); //  Start polling after splash
		});

	}

	private checkDeviceAndNavigate(): void {

		// Block form input when popup open
		if (this.dialog.openDialogs.length > 0 || this.isOpenSwalAlert) {
			this.isAnypopped = true;
			this.deviceForm.disable();
		} else {
			this.isAnypopped = false;
			this.deviceForm.enable();
		}

		// Ensure UID exists
		if (!this.deviceUID) return;

		this.authService.isExistedDevice(this.deviceUID).subscribe((res: any) => {

			// API failed / network issue
			if (res?.status !== "success") {
				this.isOpenSwalAlert = false;
				if (!this.isExistedCalled) {
					this.toastService.error(res?.message || "Device verification failed");
					this.isExistedCalled = true;
				}
				return;
			}

			const { client_status, device_status, isexpired } = res;

			//  Approved Device
			if (client_status && device_status && !isexpired) {
				sessionStorage.setItem("device", JSON.stringify(res));
				sessionStorage.setItem("username", res.username);
				clearInterval(this.pollInterval);

				if (!this.isExistedCalled) {
					this.toastService.success("Device Verified! Redirecting...");
					this.isExistedCalled = true;
				}

				this.router.navigate(['player']);
				return;
			}

			// Device disabled by admin
			if (!client_status && !device_status) {
				clearInterval(this.pollInterval);
				this.isOpenSwalAlert = false;
				this.toastService.error("Device Disabled by Admin");
				sessionStorage.clear();
				this.router.navigate(['login']);
				return;
			}

			//  Subscription Expired
			if (isexpired) {
				this.type = "Subscription Expired!";
				this.text = "Please contact support to renew subscription.";
				this.isOpenSwalAlert = true;
				return;
			}

			//  Approval Pending
			// Approval Pending (QR + Manual)
			// Approval Pending
			if (client_status === true && device_status === false && !isexpired) {

				this.type = "Approval Pending...!";
				this.text = "Please wait until admin approves your device.";
				this.isOpenSwalAlert = true;

				this.isExistedCalled = true;

				return;
			}

			else {
				// Device is known – DO NOT show popup
				this.isOpenSwalAlert = false;
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
		this.isAnypopped = true;   // Disable the input after submit Form
		if (!this.deviceForm.valid || !this.deviceUID) {
			this.toastService.info('Invalid form');
			return;
		}

		this.isNewRegistration = true;  // user manually submitting code

		const code = this.deviceForm.value.deviceCode;

		this.authService.signup(code, this.deviceUID).subscribe((res: any) => {
			if (res?.status === 'Failed') {
				this.toastService.error(res.message);
			} else {
				this.toastService.success("Device Registered Successfully!");

				if (res?.device_uid) {
					this.deviceUID = res.device_uid;
				}

				this.isExistedCalled = false;
				this.startPolling();
			}
		});
	}


	ngOnDestroy(): void {
		if (this.pollInterval) clearInterval(this.pollInterval);
	}

}
