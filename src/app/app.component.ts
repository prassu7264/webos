import { Component, ElementRef, HostListener, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SpeedTestService } from './_core/services/speed-test.service';
import { Router } from '@angular/router';
// import { OrientationService } from './_core/services/orientation.service';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
	private lastEnterPressTime = 0;
	netspeed: any;
	intervalId: any;
	isLoginPage = false;
	@ViewChild('exitconfirm', { static: true }) exitconfirm!: TemplateRef<any>;
	@ViewChild('DeviceSettings', { static: true }) deviceSettings!: TemplateRef<any>;
	dialogRef: any
	constructor(private dialog: MatDialog, private speedTestService: SpeedTestService, private router: Router) {
	}
	async ngOnInit() {
		window.onpopstate = () => {
			history.go(1);
			this.exitApp();
		};

	}

	// Expose navigator state to template
	get isOnline(): boolean {
		return navigator.onLine;
	}
	goOffline() {
		this.router.navigate(['/offline-player']);
	}


	ngOnDestroy(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
		}
	}

	// Method to open the dialog
	openInstallDialog(): void {
		if (this.dialogRef) {
			// If the dialog is already open, return early to prevent reopening
			console.log('Dialog is already open!');
			return;
		}
		this.dialogRef = this.dialog.open(this.deviceSettings, {
			width: 'fit-content'
		});

		this.dialogRef.afterClosed().subscribe((result: any) => {
			console.log('Dialog closed with result:', result);
			// Handle the result here if necessary
			this.dialogRef = null;
		});
	}


	@HostListener('window:keydown', ['$event'])
	handleKeyDown(event: KeyboardEvent) {

		switch (event.keyCode) {
			case 13: // Enter / OK
				const now = Date.now();
				const delta = now - this.lastEnterPressTime;
				this.lastEnterPressTime = now;
				console.log("Enter key pressed");
				if (delta < 1000) {

					if (sessionStorage.getItem("device")) {
						this.openInstallDialog();
					}
				}
				break;
			case 10009:
				this.exitApp();
				break;
			case 461:
				this.exitApp();
				break;
			default:
				console.log('Key pressed, keyCode(default):', event.keyCode);

		}
	}


	exitApp() {
		try {
			// Handle native webOS exit
			if (typeof window !== "undefined" && (window as any).webOS?.platformBack) {
				console.log("Exiting via webOS.platformBack()");
				(window as any).webOS.platformBack();
				return;
			}

			const openDialogs = this.dialog.openDialogs;

			if (openDialogs.length > 0) {
				//  If any popup is open → close the topmost one
				const topDialog = openDialogs[openDialogs.length - 1];
				topDialog.close();
				console.log("Closed topmost popup instead of showing exit.");
			} else {
				//  No popups open → show exit confirmation
				if (!this.dialog.openDialogs.find(d => d.componentInstance === this.exitconfirm)) {
					this.dialog.open(this.exitconfirm, {
						minWidth: '450px',
						disableClose: true
					}).afterClosed().subscribe((result: any) => {
						console.log('Exit popup closed with result:', result);
						if (result) {
							window.close();
						}
					});
				}
			}
		} catch (err) {
			console.error("❌ exitApp error:", err);
		}
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
			focusable[next].focus();
			event.preventDefault();
		}

		if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
			const prev = (index - 1 + focusable.length) % focusable.length;
			focusable[prev].focus();
			event.preventDefault();
		}

		if (event.key === 'Enter') {

			(document.activeElement as HTMLElement)?.click();
		}
		const isPopupOpen = this.dialog.openDialogs.length > 0;
		if (isPopupOpen) {
			if (event.key === 'Escape' || event.keyCode === 461) {
				this.dialog.closeAll();
				console.log('Popup closed');
			} else {
				event.preventDefault();
				event.stopPropagation();
				console.log('Blocked key:', event.key);
			}
			return;
		}
	}
}

