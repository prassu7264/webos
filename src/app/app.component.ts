import { Component, ElementRef, HostListener, OnDestroy, OnInit, TemplateRef, ViewChild, AfterViewInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from './_core/services/auth.service';
import { DeviceInfoService } from './_core/services/device-info.service';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy, AfterViewInit {
	private lastEnterPressTime = 0;
	netspeed: any;
	intervalId: any;
	isLoginPage = false;
	private isBackHandlerRegistered = false;
	topScrollers: any[] = [];
	bottomScrollers: any[] = [];
	device: any;
	scrollers: any[] = [];
	scrollerInterval: any;
	@ViewChild('exitconfirm', { static: true }) exitconfirm!: TemplateRef<any>;
	@ViewChild('DeviceSettings', { static: true }) deviceSettings!: TemplateRef<any>;
	dialogRef: any;
	exitDialogRef: MatDialogRef<any> | null = null;

	constructor(private dialog: MatDialog, private router: Router, private authService: AuthService, private deviceInfoService: DeviceInfoService) { }

	ngOnInit() {
		this.registerBackButtonTrap();
		this.device = JSON.parse(sessionStorage.getItem('device') || '{}');
		//  Check device validity first
		if (this.device?.androidid) {
			this.isExistedDevice(this.device.androidid);
		}

		//  Still listen for UID changes if it updates later
		this.deviceInfoService.deviceUID$.subscribe(uid => {
			if (uid && (!this.device.androidid || this.device.androidid !== uid)) {
				this.device.androidid = uid;
				this.isExistedDevice(uid);
			}
		});

		if (this.device?.androidid) {
			this.loadScrollers();
			this.startScrollerUpdates();
		}

		// Listen for device UID changes (if it’s set later)
		this.deviceInfoService.deviceUID$.subscribe(uid => {
			if (uid && (!this.device.androidid || this.device.androidid !== uid)) {
				this.device.androidid = uid;
				this.loadScrollers();
			}
		});
	}

	private registerBackButtonTrap() {
		if (this.isBackHandlerRegistered) return;
		this.isBackHandlerRegistered = true;
		window.onpopstate = () => {
			history.pushState(null, '', location.href);
			this.exitApp();
		};
		history.pushState(null, '', location.href);
	}

	private loadScrollers() {
		if (!this.device) return;

		// Ensure the vertical flag is set
		if (this.device.orientation) {
			this.device.isVertical = this.device.orientation.includes('9:16');
		} else if (this.device.isVertical === undefined) {
			// fallback default (you can adjust this)
			this.device.isVertical = false;
		}

		this.authService.getMediafiles(this.device).subscribe({
			next: (res: any) => {
				const scrollers = res?.scrollerList || res?.scrollermessage || res?.tickerList || [];
				this.scrollers = scrollers;
				this.topScrollers = scrollers.filter((s: any) => s.type === 'TOP');
				this.bottomScrollers = scrollers.filter((s: any) => s.type === 'BOTTOM');
			},
			error: (err) => {
				console.error(' Scroller fetch failed:', err);
			}
		});
	}

	private startScrollerUpdates() {
		this.scrollerInterval = setInterval(() => {
			if (!this.device) return;
			this.authService.getMediafiles(this.device).subscribe({
				next: (res: any) => {
					const newScrollers = res?.scrollerList || res?.scrollermessage || res?.tickerList || [];

					// Only proceed if something changed
					if (JSON.stringify(this.scrollers) !== JSON.stringify(newScrollers)) {
						// console.log(' Scrollers updated');
						this.scrollers = [...newScrollers];

						const updatedTop = newScrollers.filter((s: any) => s.type === 'TOP');
						const updatedBottom = newScrollers.filter((s: any) => s.type === 'BOTTOM');

						const topChanged = JSON.stringify(this.topScrollers) !== JSON.stringify(updatedTop);
						const bottomChanged = JSON.stringify(this.bottomScrollers) !== JSON.stringify(updatedBottom);

						if (topChanged || bottomChanged) {
							this.topScrollers = [...updatedTop];
							this.bottomScrollers = [...updatedBottom];
							// console.log('Scroller position/content updated instantly!');
						}
					}
				},
				error: (err) => {
					console.error(' Scroller update failed:', err);
				}
			});
		}, 1000); //  set to 1 sec — 1000ms is too frequent and may cause flicker
	}

	private isExistedDevice(deviceUID: string) {
		this.authService.isExistedDevice(deviceUID).subscribe((res: any) => {
			const { client_status, device_status, isexpired, orientation } = res;
			if (res?.status !== 'success' || !client_status || !device_status || isexpired) {
				console.warn(' Device not active or expired, skipping scroller load');
				return;
			}

			//  Device is valid, update info
			const uid = this.device.androidid;
			this.device = res;
			this.device.androidid = uid;
			this.device.isVertical = this.device?.orientation?.includes('9:16');
			sessionStorage.setItem('device', JSON.stringify(this.device));

			// Now safe to load scrollers
			this.loadScrollers();
			this.startScrollerUpdates();
		});
	}

	ngAfterViewInit(): void {
		if (this.isLoginPage) {
			setTimeout(() => this.registerExitPopupFocus(), 100);
		}
	}

	openInstallDialog(): void {
		if (this.dialogRef) return;
		this.dialogRef = this.dialog.open(this.deviceSettings, { width: 'fit-content' });
		this.dialogRef.afterClosed().subscribe(() => this.dialogRef = null);
	}

	@HostListener('window:keydown', ['$event'])
	handleKeyboardEvent(event: KeyboardEvent) {
		if (event.keyCode === 461) { // Key code for Back button on LG webO`0
			event.preventDefault(); // Prevent default browser/webOS behavior
			console.log('Back button pressed!');
		}
		switch (event.keyCode) {
			case 13:
				const now = Date.now();
				const delta = now - this.lastEnterPressTime;
				this.lastEnterPressTime = now;
				if (delta < 1000 && sessionStorage.getItem("device")) {
					this.openInstallDialog();
				}
				break;
			case 10009: // Tizen Back
			case 10182:
			case 461:   // webOS Back
			case 27:    // ESC / Browser
				event.preventDefault();
				event.stopPropagation();
				console.log("Back Button Works!!")

				// Delay slightly to prevent multiple triggers
				setTimeout(() => this.exitApp(), 150);
				break;

		}
	}

	exitApp() {
		try {
			const openDialogs = this.dialog.openDialogs;

			//  1. If any dialog is open, close the topmost and stop
			if (openDialogs.length > 0) {
				const topDialog = openDialogs[openDialogs.length - 1];
				topDialog.close();
				return;
			}

			//  2. If no dialogs open, only then show Exit confirmation
			if (!this.exitDialogRef || !this.exitDialogRef.getState || this.exitDialogRef.getState() === 0) {
				// Make sure Exit popup is not already open
				const alreadyOpen = this.dialog.openDialogs.some(
					d => d.componentInstance?.templateRef === this.exitconfirm
				);
				if (alreadyOpen) return;

				this.exitDialogRef = this.dialog.open(this.exitconfirm, {
					minWidth: '450px',
					disableClose: true
				});

				this.exitDialogRef.afterOpened().subscribe(() => {
					this.registerExitPopupFocus();
				});

				this.exitDialogRef.afterClosed().subscribe((result: any) => {
					this.exitDialogRef = null; //  clear reference

					if (result) {
						try {
							if ((window as any).tizen) {
								(window as any).tizen.application.getCurrentApplication().exit();
							} else if ((window as any).webOS) {
								(window as any).webOS.platformBack();
							} else {
								window.close();
							}
						} catch (e) {
							window.close();
						}
					}
				});
			}
		} catch (err) {
			console.error("❌ exitApp error:", err);
		}
	}

	private registerExitPopupFocus() {
		const dialogContainer = document.querySelector('.mat-dialog-container');
		if (!dialogContainer) return;

		const buttons = Array.from(dialogContainer.querySelectorAll<HTMLButtonElement>('button.exit-btn'));
		if (!buttons.length) return;

		let index = 0;
		buttons[index].focus();

		const keyListener = (event: KeyboardEvent) => {
			//  Block all default key handling outside popup
			event.stopPropagation();
			event.preventDefault();

			if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
				index = (index + 1) % buttons.length;
				buttons[index].focus();
			} else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
				index = (index - 1 + buttons.length) % buttons.length;
				buttons[index].focus();
			} else if (event.key === 'Enter') {
				buttons[index].click();
			} else if (event.key === 'Escape' || event.keyCode === 461 || event.keyCode === 10009) {
				this.exitDialogRef?.close();

			}
		};

		//  Capture key events globally and lock focus inside popup
		document.addEventListener('keydown', keyListener, true);

		this.exitDialogRef?.afterClosed().subscribe(() => {
			//  Remove listener when popup is closed
			document.removeEventListener('keydown', keyListener, true);
		});
	}

	@HostListener('document:keydown', ['$event'])
	onKeydown(event: KeyboardEvent) {
		const focusable = Array.from(
			document.querySelectorAll<HTMLElement>(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			)
		).filter(el => !el.hasAttribute('disabled'));

		const index = focusable.indexOf(document.activeElement as HTMLElement);

		if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
			const next = (index + 1) % focusable.length;
			focusable[next]?.focus();
			event.preventDefault();
		}

		if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
			const prev = (index - 1 + focusable.length) % focusable.length;
			focusable[prev]?.focus();
			event.preventDefault();
		}

		if (event.key === 'Enter') {
			(document.activeElement as HTMLElement)?.click();
		}

		const isPopupOpen = this.dialog.openDialogs.length > 0;
		if (isPopupOpen) {
			if (event.key === 'Escape' || event.keyCode === 461 || event.keyCode === 10009) {
				this.dialog.closeAll();
			} else {
				event.preventDefault();
				event.stopPropagation();
			}
			return;
		}
	}


	ngOnDestroy(): void {
		if (this.intervalId) clearInterval(this.intervalId);
	}
}

