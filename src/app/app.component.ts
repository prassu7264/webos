import { AfterViewInit, Component, HostListener, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { LoggerService } from './_core/services/logger.service';

declare const tizen: any;
@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy, AfterViewInit {

	private lastEnterPressTime = 0;
	private lastAboutTvZeroPressTime = 0;
	private lastAboutTvShortcutEventId = '';
	private aboutTvDialogRef: any = null;
	netspeed: any;
	intervalId: any;
	isLoginPage = false;
	dialogRef: any;
	isPendrive: any = false;
	aboutTvDetails = {
		platform: 'Not Available',
		tizenOsVersion: 'Not Available',
		modelName: 'Not Available',
		modelCode: 'Not Available',
		modelNumber: 'Not Available',
		firmwareVersion: 'Not Available',
		duid: 'Not Available',
		buildId: 'Not Available',
		manufacturer: 'Not Available',
		serialNumber: 'Not Available',
		buildVersion: 'Not Available',
		panelResolution: 'Not Available',
		refreshRate: 'Not Available',
		networkType: 'Not Available',
		ipAddress: 'Not Available',
		ipv6Address: 'Not Available',
		macAddress: 'Not Available',
		locale: 'Not Available',
		timezone: 'Not Available',
		storageTotal: 'Not Available',
		storageAvailable: 'Not Available',
		cpuArch: 'Not Available',
		localSet: 'Not Available',
		tvServerType: 'Not Available'
	};
	@ViewChild('exitconfirm', { static: true }) exitconfirm!: TemplateRef<any>;
	@ViewChild('DeviceSettings', { static: true }) deviceSettings!: TemplateRef<any>;
	@ViewChild('aboutTvInfo', { static: true }) aboutTvInfo!: TemplateRef<any>;


	constructor(private dialog: MatDialog, private logger: LoggerService) {
		this.logger.info('constructor', 'AppComponent initialized');
	}
	ngOnInit() {
		this.logger.info('ngOnInit', 'AppComponent loaded');
		this.registerTizenRemoteKeys();
	}

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
		if (this.handleAboutTvShortcut(event)) {
			return;
		}

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

	exitPendriveMode(): void {
		this.logger.warn('exitPendriveMode', 'User exited pendrive mode from settings');
		sessionStorage.setItem('ModeConfiguration', 'false');
		this.isPendrive = false;
		this.dialog.closeAll();
	}

	private registerTizenRemoteKeys(): void {
		try {
			if (typeof tizen === 'undefined' || !tizen?.tvinputdevice) {
				return;
			}

			const keysToRegister = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
			if (typeof tizen.tvinputdevice.registerKeyBatch === 'function') {
				tizen.tvinputdevice.registerKeyBatch(
					keysToRegister,
					() => this.logger.info('registerTizenRemoteKeys', 'Registered remote numeric keys', keysToRegister),
					(error: any) => this.logger.error('registerTizenRemoteKeys', 'Failed to register remote numeric keys', error)
				);
				return;
			}

			if (typeof tizen.tvinputdevice.registerKey === 'function') {
				keysToRegister.forEach((key: string) => {
					try {
						tizen.tvinputdevice.registerKey(key);
					} catch (error: any) {
						this.logger.error('registerTizenRemoteKeys', `Failed to register key ${key}`, error);
					}
				});
				this.logger.info('registerTizenRemoteKeys', 'Registered remote numeric keys', keysToRegister);
			}
		} catch (error: any) {
			this.logger.error('registerTizenRemoteKeys', 'Remote key registration failed', error);
		}
	}

	// ========================
	// HIDDEN Feature
	// ========================

	private isAboutTvZeroKey(event: KeyboardEvent): boolean {
		const code = (event as any).code;
		const keyCode = (event as any).keyCode ?? (event as any).which;
		return event.key === '0' || event.key === 'Numpad0' || code === 'Digit0' || code === 'Numpad0' || keyCode === 48 || keyCode === 96;
	}

	private normalizeTvInfoValue(value: any): string {
		if (value === undefined || value === null) {
			return 'Not Available';
		}

		const parsed = String(value).trim();
		if (!parsed || parsed.toLowerCase() === 'undefined' || parsed.toLowerCase() === 'null' || parsed.toLowerCase() === 'false') {
			return 'Not Available';
		}
		return parsed;
	}

	private safeInfoCall(call: () => any): string {
		try {
			return this.normalizeTvInfoValue(call());
		} catch {
			return 'Not Available';
		}
	}

	private firstAvailable(...values: string[]): string {
		return values.find((value: string) => value !== 'Not Available') || 'Not Available';
	}

	private formatStorageSize(bytes: any): string {
		const size = Number(bytes);
		if (!Number.isFinite(size) || size < 0) {
			return 'Not Available';
		}
		if (size === 0) {
			return '0 B';
		}

		const units = ['B', 'KB', 'MB', 'GB', 'TB'];
		const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
		const value = size / Math.pow(1024, index);
		return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
	}

	private networkTypeName(type: any): string {
		const mapped: { [key: string]: string } = {
			'0': 'None',
			'1': 'Ethernet',
			'2': 'Wi-Fi',
			'3': 'Cellular'
		};
		const key = String(type ?? '');
		return mapped[key] || this.normalizeTvInfoValue(type);
	}

	private tizenPlatformVersionFromUserAgent(): string {
		const userAgent = this.normalizeTvInfoValue((window as any)?.navigator?.userAgent);
		if (userAgent === 'Not Available') {
			return 'Not Available';
		}

		const match = userAgent.match(/Tizen[\/\s]([0-9]+(?:\.[0-9]+)?)/i);
		if (!match || !match[1]) {
			return 'Not Available';
		}

		return `tv-${match[1]}`;
	}

	private async getSystemInfoProperty(property: string): Promise<any> {
		const systemInfo = (window as any)?.tizen?.systeminfo;
		if (!systemInfo || typeof systemInfo.getPropertyValue !== 'function') {
			return null;
		}

		return new Promise((resolve) => {
			try {
				systemInfo.getPropertyValue(
					property,
					(data: any) => resolve(data),
					() => resolve(null)
				);
			} catch {
				resolve(null);
			}
		});
	}

	private extractStorageSummary(storageInfo: any): { total: string; available: string } {
		const units = Array.isArray(storageInfo?.units)
			? storageInfo.units
			: (Array.isArray(storageInfo) ? storageInfo : []);

		if (!units.length) {
			return { total: 'Not Available', available: 'Not Available' };
		}

		const mainUnit = units.find((unit: any) => unit?.type === 'INTERNAL' || unit?.isRemovable === false) || units[0];
		return {
			total: this.formatStorageSize(mainUnit?.capacity),
			available: this.formatStorageSize(mainUnit?.availableCapacity)
		};
	}

	private async loadAboutTvDetails(): Promise<void> {
		const w: any = window;
		const productInfo = w?.webapis?.productinfo;
		const systemInfo = w?.tizen?.systeminfo;

		const capability = (key: string): string => {
			if (!systemInfo || typeof systemInfo.getCapability !== 'function') {
				return 'Not Available';
			}
			return this.safeInfoCall(() => systemInfo.getCapability(key));
		};

		const modelName = this.firstAvailable(
			this.safeInfoCall(() => productInfo?.getModel?.()),
			capability('http://tizen.org/system/model_name')
		);

		const tizenOsVersion = this.firstAvailable(
			this.tizenPlatformVersionFromUserAgent(),
			this.safeInfoCall(() => productInfo?.getVersion?.()),
			capability('http://tizen.org/feature/platform.version')
		);

		const [buildInfo, displayInfo, networkInfo, localeInfo, storageInfo, cpuInfo] = await Promise.all([
			this.getSystemInfoProperty('BUILD'),
			this.getSystemInfoProperty('DISPLAY'),
			this.getSystemInfoProperty('NETWORK'),
			this.getSystemInfoProperty('LOCALE'),
			this.getSystemInfoProperty('STORAGE'),
			this.getSystemInfoProperty('CPU')
		]);

		const storage = this.extractStorageSummary(storageInfo);
		const resolution = (displayInfo?.resolutionWidth && displayInfo?.resolutionHeight)
			? `${displayInfo.resolutionWidth} x ${displayInfo.resolutionHeight}`
			: 'Not Available';

		this.aboutTvDetails = {
			platform: productInfo ? 'Samsung Tizen' : (w?.PalmServiceBridge ? 'LG webOS' : 'Browser'),
			tizenOsVersion,
			modelName,
			modelCode: this.safeInfoCall(() => productInfo?.getModelCode?.()),
			modelNumber: capability('http://tizen.org/system/model_number'),
			firmwareVersion: this.safeInfoCall(() => productInfo?.getFirmware?.()),
			duid: this.safeInfoCall(() => productInfo?.getDuid?.()),
			buildId: this.firstAvailable(
				this.normalizeTvInfoValue(buildInfo?.id),
				capability('http://tizen.org/system/build.id')
			),
			manufacturer: this.firstAvailable(
				this.normalizeTvInfoValue(buildInfo?.manufacturer),
				capability('http://tizen.org/system/manufacturer')
			),
			serialNumber: this.firstAvailable(
				this.normalizeTvInfoValue(buildInfo?.serial),
				capability('http://tizen.org/system/serial')
			),
			buildVersion: this.firstAvailable(
				this.normalizeTvInfoValue(buildInfo?.buildVersion),
				capability('http://tizen.org/system/build.string')
			),
			panelResolution: resolution,
			refreshRate: this.normalizeTvInfoValue(displayInfo?.refreshRate),
			networkType: this.networkTypeName(networkInfo?.networkType),
			ipAddress: this.normalizeTvInfoValue(networkInfo?.ipAddress),
			ipv6Address: this.normalizeTvInfoValue(networkInfo?.ipv6Address),
			macAddress: this.normalizeTvInfoValue(networkInfo?.macAddress),
			locale: this.firstAvailable(
				this.normalizeTvInfoValue(localeInfo?.language),
				this.normalizeTvInfoValue(localeInfo?.country)
			),
			timezone: this.normalizeTvInfoValue(Intl.DateTimeFormat().resolvedOptions().timeZone),
			storageTotal: storage.total,
			storageAvailable: storage.available,
			cpuArch: this.firstAvailable(
				this.normalizeTvInfoValue(cpuInfo?.architecture),
				capability('http://tizen.org/system/cpu.arch')
			),
			localSet: this.safeInfoCall(() => productInfo?.getLocalSet?.()),
			tvServerType: this.safeInfoCall(() => productInfo?.getSmartTVServerType?.())
		};
	}

	private openAboutTvInfoDialog(): void {
		if (this.aboutTvDialogRef) {
			return;
		}

		this.logger.info('openAboutTvInfoDialog', 'Opening About TV info dialog');
		void this.loadAboutTvDetails();
		this.dialog.closeAll();
		this.aboutTvDialogRef = this.dialog.open(this.aboutTvInfo, {
			width: '60vw',
			disableClose: true
		});

		this.aboutTvDialogRef.afterClosed().subscribe(() => {
			this.logger.info('openAboutTvInfoDialog', 'About TV info dialog closed');
			this.aboutTvDialogRef = null;
			this.dialogRef = null;
		});
	}

	private handleAboutTvShortcut(event: KeyboardEvent): boolean {
		const currentHash = (window.location && window.location.hash ? window.location.hash : '').toLowerCase();
		if (currentHash.indexOf('/player') === -1) {
			this.lastAboutTvZeroPressTime = 0;
			return false;
		}

		const eventId = `${event.type}:${event.keyCode}:${event.timeStamp}`;
		if (this.lastAboutTvShortcutEventId === eventId) {
			return false;
		}
		this.lastAboutTvShortcutEventId = eventId;

		if (!this.isAboutTvZeroKey(event)) {
			return false;
		}

		const now = Date.now();
		const delta = now - this.lastAboutTvZeroPressTime;
		this.lastAboutTvZeroPressTime = now;

		if (delta < 2200) {
			this.openAboutTvInfoDialog();
			event.preventDefault();
			event.stopPropagation();
			return true;
		}
		return false;
	}

	private isArrowDownKey(event: KeyboardEvent): boolean {
		const code = (event as any).code;
		const keyCode = (event as any).keyCode ?? (event as any).which;
		return event.key === 'ArrowDown' || event.key === 'Down' || code === 'ArrowDown' || keyCode === 40;
	}

	private isArrowUpKey(event: KeyboardEvent): boolean {
		const code = (event as any).code;
		const keyCode = (event as any).keyCode ?? (event as any).which;
		return event.key === 'ArrowUp' || event.key === 'Up' || code === 'ArrowUp' || keyCode === 38;
	}

	private handleAboutTvScroll(event: KeyboardEvent): boolean {
		if (!this.aboutTvDialogRef) {
			return false;
		}

		const container = document.querySelector('.about-tv-details') as HTMLElement | null;
		if (!container) {
			return false;
		}

		const scrollStep = 90;

		if (this.isArrowDownKey(event)) {
			container.scrollBy({ top: scrollStep, behavior: 'smooth' });
			event.preventDefault();
			event.stopPropagation();
			return true;
		}

		if (this.isArrowUpKey(event)) {
			container.scrollBy({ top: -scrollStep, behavior: 'smooth' });
			event.preventDefault();
			event.stopPropagation();
			return true;
		}

		return false;
	}

	// ========================
	// FOCUS & POPUP HANDLING
	// ========================
	@HostListener('document:keydown', ['$event'])
	onKeydown(event: KeyboardEvent) {
		if (this.handleAboutTvShortcut(event)) {
			return;
		}

		if (this.handleAboutTvScroll(event)) {
			return;
		}

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
