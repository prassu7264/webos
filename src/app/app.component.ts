import { AfterViewInit, Component, HostListener, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { LoggerService } from './_core/services/logger.service';
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
	dialogRef: any;
	isPendrive: any = false;
	@ViewChild('exitconfirm', { static: true }) exitconfirm!: TemplateRef<any>;
	@ViewChild('DeviceSettings', { static: true }) deviceSettings!: TemplateRef<any>;


	constructor(private dialog: MatDialog, private logger: LoggerService) {
		this.logger.info('constructor', 'AppComponent initialized');
	}
	ngOnInit() { this.logger.info('ngOnInit', 'AppComponent loaded'); }

	ngAfterViewInit(): void { this.logger.info('ngAfterViewInit', 'View initialized'); }

	ngOnDestroy(): void {
		this.logger.warn('ngOnDestroy', 'Component destroyed');
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.logger.info('ngOnDestroy', 'Interval cleared', this.intervalId);
		}
	}

	// ========================
	// OPEN SETTINGS DIALOG
	// ========================
	openInstallDialog(): void {
		this.logger.log('openInstallDialog', 'Attempting to open dialog', {
			isLoginPage: this.isLoginPage,
			isPendrive: this.isPendrive
		});

		if (this.dialogRef) {
			this.logger.warn('openInstallDialog', 'Dialog already open');
			return;
		}
		this.dialogRef = this.dialog.open(this.deviceSettings, {
			width: '45vw',
			data: { isLoginPage: this.isLoginPage, isPendrive: this.isPendrive }
		});

		this.dialogRef.afterClosed().subscribe((result: any) => {
			this.logger.info('openInstallDialog', 'Dialog closed', result);
			this.dialogRef = null;
		});
	}

	// ========================
	// KEY HANDLER
	// ========================
	@HostListener('window:keydown', ['$event'])
	handleKeyDown(event: KeyboardEvent) {

		this.logger.log('handleKeyDown', 'Key pressed', {
			key: event.key,
			keyCode: event.keyCode
		});

		switch (event.keyCode) {
			case 13: // Enter / OK
				const now = Date.now();
				const delta = now - this.lastEnterPressTime;
				this.lastEnterPressTime = now;

				this.logger.info('handleKeyDown', 'Enter pressed', { delta });

				if (delta < 2200) {
					this.isPendrive = sessionStorage.getItem("ModeConfiguration") === "true";

					this.logger.info('handleKeyDown', 'Double enter detected', {
						isPendrive: this.isPendrive,
						ModeConfiguration: sessionStorage.getItem('ModeConfiguration')
					});

					this.openInstallDialog();
				}
				break;
			case 10009:  // EXIT
				this.logger.warn('handleKeyDown', 'Exit key pressed');
				this.exitApp();
				break;
			default:
				break;

		}
	}

	// ========================
	// EXIT APPLICATION
	// ========================
	exitApp() {
		this.logger.warn('exitApp', 'Exit triggered');

		try {
			if (typeof window !== "undefined" && (window as any).webOS?.platformBack) {
				this.logger.info('exitApp', 'Using webOS.platformBack');
				(window as any).webOS.platformBack();
				return;
			}


			if (this.dialogRef) {
				this.logger.warn('exitApp', 'Exit dialog already open');
				return;
			}
			this.dialogRef = this.dialog.open(this.exitconfirm, {
				minWidth: '450px'
			});

			this.dialogRef.afterClosed().subscribe((result: any) => {
				this.logger.info('exitApp', 'Exit dialog closed', result);
				if (result) {
					this.logger.warn('exitApp', 'Closing window');
					window.close();
				}
				this.dialogRef = null;
			});


		} catch (err) {
			this.logger.error('exitApp', 'Exit failed', err);
		}
	}

	// ========================
	// FOCUS & POPUP HANDLING
	// ========================
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

		this.logger.log('onKeydown', 'Document keydown', {
			key: event.key,
			popupOpen: isPopupOpen
		});

		if (isPopupOpen) {
			if (event.key === 'Escape' || event.keyCode === 461) {
				this.logger.warn('onKeydown', 'Popup closed via key');
				this.dialog.closeAll();
			} else {
				event.preventDefault();
				event.stopPropagation();
			}
			return;
		}
	}
}
