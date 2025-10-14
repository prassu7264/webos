import { Component, ElementRef, HostListener, OnDestroy, OnInit, TemplateRef, ViewChild, AfterViewInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router, NavigationEnd } from '@angular/router';

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

	@ViewChild('exitconfirm', { static: true }) exitconfirm!: TemplateRef<any>;
	@ViewChild('DeviceSettings', { static: true }) deviceSettings!: TemplateRef<any>;
	dialogRef: any;
	exitDialogRef!: MatDialogRef<any>;

	constructor(private dialog: MatDialog, private router: Router) { }

	ngOnInit() {
		this.router.events.subscribe(event => {
			if (event instanceof NavigationEnd) {
				this.isLoginPage = event.urlAfterRedirects.includes('/login');

				if (this.isLoginPage) {
					history.pushState(null, '', location.href);
					window.onpopstate = () => {
						history.pushState(null, '', location.href);
						this.exitApp();
					};
				}
			}
		});

		this.registerBackButtonTrap();

		//  Real TV remote back trap
		if ((window as any).webOS && typeof (window as any).webOS.platformBack === 'function') {
			(window as any).webOS.platformBack = () => {
				console.log(' TV Remote back trapped');
				this.exitApp();
			};
		} else if ((window as any).webOS && (window as any).webOSSystem) {
			(window as any).webOSSystem.platformBack = () => {
				console.log(' TV Remote back trapped (System)');
				this.exitApp();
			};
		}
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

	ngAfterViewInit(): void {
		if (this.isLoginPage) {
			setTimeout(() => this.registerExitPopupFocus(), 100);
		}
	}

	get isOnline(): boolean {
		return navigator.onLine;
	}

	goOffline() {
		this.router.navigate(['/offline-player']);
	}

	openInstallDialog(): void {
		if (this.dialogRef) return;
		this.dialogRef = this.dialog.open(this.deviceSettings, { width: 'fit-content' });
		this.dialogRef.afterClosed().subscribe(() => this.dialogRef = null);
	}

	@HostListener('window:keydown', ['$event'])
	handleKeyDown(event: KeyboardEvent) {
		switch (event.keyCode) {
			case 13:
				const now = Date.now();
				const delta = now - this.lastEnterPressTime;
				this.lastEnterPressTime = now;
				if (delta < 1000 && sessionStorage.getItem("device")) {
					this.openInstallDialog();
				}
				break;
			case 10009:
			case 461:
			case 27:
				this.exitApp();
				event.preventDefault();
				event.stopPropagation();
				break;
		}
	}

	exitApp() {
		try {
			const openDialogs = this.dialog.openDialogs;
			if (openDialogs.length > 0) {
				openDialogs[openDialogs.length - 1].close();
				return;
			}

			if (!this.dialog.openDialogs.find(d => d.componentInstance === this.exitconfirm)) {
				this.exitDialogRef = this.dialog.open(this.exitconfirm, {
					minWidth: '450px',
					disableClose: true
				});

				this.exitDialogRef.afterOpened().subscribe(() => {
					this.registerExitPopupFocus();
				});

				this.exitDialogRef.afterClosed().subscribe((result: any) => {
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
				this.exitDialogRef.close();
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
		const openDialogs = this.dialog.openDialogs;
		const isExitPopupOpen = !!openDialogs.find(d => d.componentInstance === this.exitconfirm);
		const isDevicePopupOpen = !!openDialogs.find(d => d.componentInstance === this.deviceSettings);

		//  1. Exit popup has highest priority → lock focus ONLY to popup buttons
		if (isExitPopupOpen) {
			const popupButtons = Array.from(
				document.querySelectorAll<HTMLElement>('.exit-btn')
			);

			if (popupButtons.length > 0) {
				let index = popupButtons.indexOf(document.activeElement as HTMLElement);
				if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
					index = (index + 1) % popupButtons.length;
					popupButtons[index]?.focus();
					event.preventDefault();
					event.stopPropagation();
					return;
				}
				if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
					index = (index - 1 + popupButtons.length) % popupButtons.length;
					popupButtons[index]?.focus();
					event.preventDefault();
					event.stopPropagation();
					return;
				}
				if (event.key === 'Enter') {
					(document.activeElement as HTMLElement)?.click();
					event.preventDefault();
					event.stopPropagation();
					return;
				}
			}

			// Block everything else (so login form or background can't be focused)
			event.stopPropagation();
			event.preventDefault();
			return;
		}

		//  2. Device Settings Popup: allow normal arrow + enter inside
		if (isDevicePopupOpen) {
			// do NOT block anything here - let it work naturally
			return;
		}

		//  3. Normal page navigation when no popup is open
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
	}




	ngOnDestroy(): void {
		if (this.intervalId) clearInterval(this.intervalId);
	}
}
