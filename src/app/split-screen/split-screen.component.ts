/* split-screen.component.ts */
import { Component, OnInit, OnDestroy } from '@angular/core';
import { GridsterConfig, GridsterItem } from 'angular-gridster2';
import { AuthService } from '../_core/services/auth.service';
import { DeviceInfoService } from '../_core/services/device-info.service';
import { interval, Subscription, tap } from 'rxjs';
import { Router } from '@angular/router';
import { ConnectionService, ConnectionState } from 'ng-connection-service';
import { WebosDownloadService } from '../_core/services/webos-download.service';

declare var webOS: any;
@Component({
	selector: 'app-split-screen',
	templateUrl: './split-screen.component.html',
	styleUrls: ['./split-screen.component.scss']
})
export class SplitScreenComponent implements OnInit, OnDestroy {
	status = 'ONLINE';
	currentState!: ConnectionState;
	subscription = new Subscription();
	options: GridsterConfig;
	splitScreen: any[] = [];
	splitScreenList: any[] = [];
	updatedTime: any = '';
	splitCurrentIndex = 0;
	zoneinfo: GridsterItem[] | any[] = [];
	device: any;
	intervalSub?: Subscription;
	currentIndex = 0;
	private autoplayTimer?: any;
	private redirecting = false;
	scrollers: any[] = [];
	topScrollers: any[] = [];
	bottomScrollers: any[] = [];
	zoneCompletionMap: { [zoneId: number]: boolean } = {};
	refreshKey: number = 0;
	private intervalId: any;

	constructor(
		private authService: AuthService,
		private deviceInfoService: DeviceInfoService,
		private router: Router,
		private connectionService: ConnectionService,
		private wds: WebosDownloadService
	) {
		this.options = {
			displayGrid: 'none',
			draggable: { enabled: false },
			resizable: { enabled: false },
			pushItems: true,
			swap: false,
			gridType: 'fit',
			margin: 0,
			outerMargin: false,
		};

		this.device = JSON.parse(sessionStorage.getItem('device') || '{}');
		if (this.device?.username && this.device?.password) this.signin();
	}

	ngOnInit(): void {
		this.device.isVertical = this.device?.orientation?.includes('9:16');

		this.deviceInfoService.deviceUID$.subscribe(uid => {
			if (uid) {
				this.device.androidid = uid;
				this.loadMediaFiles();
			}
		});

		this.intervalSub = interval(5000).subscribe(() => {
			if (this.device.androidid) {
				this.isExistedDevice(this.device.androidid);
				this.checkForUpdates();
			}
		});

		history.pushState(null, '', window.location.href);

		this.subscription.add(
			this.connectionService.monitor().pipe(
				tap((newState: ConnectionState) => {
					this.currentState = newState;
					if (this.currentState.hasNetworkConnection) {
						if (this.status === 'OFFLINE') {
							this.status = 'ONLINE';
							this.loadMediaFiles(); // re-load fresh
						}
					} else {
						this.status = 'OFFLINE';
					}
				})
			).subscribe()
		);
	}



	private signin() {
		const payload = { username: this.device.username, password: this.device.password };
		this.authService.signin(payload).subscribe({
			next: (res: any) => this.authService.saveToken(res?.accessToken),
			error: (err) => console.error('Signin failed:', err)
		});
	}

	private isExistedDevice(deviceUID: string) {
		this.authService.isExistedDevice(deviceUID).subscribe((res: any) => {
			const { client_status, device_status, isexpired, orientation } = res;
			if (res?.status !== 'success' || !client_status || !device_status || isexpired) {
				if (!this.redirecting) {
					this.redirecting = true;
					sessionStorage.clear();
					sessionStorage.setItem('isVideoPlayed', 'true');
					this.router.navigate(['/login'], { state: { from: 'player', isVideoPlayed: false } });
				}
			} else if (this.device.orientation != orientation) {
				const uid = this.device.androidid;
				this.device = res;
				this.device.androidid = uid;
				this.device.isVertical = this.device?.orientation?.includes('9:16');
				sessionStorage.setItem('device', JSON.stringify(res));
			}
		});
	}

	openOffline() {
		this.router.navigate(['/offline-player']);
	}

	private loadMediaFiles() {
		this.authService.getMediafiles(this.device).subscribe((res: any) => {
			const newLayout = this.deepCopy(res?.layout_list ?? []);
			this.updatedTime = res.updated_time;
			this.splitScreen = this.deepCopy(newLayout);
			this.splitScreenList = this.deepCopy(newLayout);
			this.scrollers = res?.scrollerList || [];
			this.topScrollers = this.scrollers.filter(s => s.type === 'TOP');
			this.bottomScrollers = this.scrollers.filter(s => s.type === 'BOTTOM');
			this.splitCurrentIndex = 0;
			this.showCurrentSlide();
		});
	}

	private checkForUpdates() {
		this.authService.getMediafiles(this.device).subscribe((res: any) => {
			const newLayout = res?.layout_list ?? [];
			const newScrollers = res?.scrollerList || res?.scrollermessage || res?.tickerList || [];

			if (JSON.stringify(this.scrollers) !== JSON.stringify(newScrollers)) {
				this.scrollers = newScrollers;
				this.topScrollers = this.scrollers.filter(s => s.type === 'TOP');
				this.bottomScrollers = this.scrollers.filter(s => s.type === 'BOTTOM');
			}
			const oldSet = this.toMediaSet(this.splitScreen);
			const newSet = this.toMediaSet(newLayout);

			if (oldSet.size !== newSet.size || [...oldSet].some(x => !newSet.has(x)) || this.updatedTime !== res.updated_time) {
				this.splitScreen = this.deepCopy(newLayout);
				this.splitScreenList = this.deepCopy(newLayout);
				this.updatedTime = res.updated_time;
				this.splitCurrentIndex = 0;
				localStorage.removeItem('splitScreenList');
				this.showCurrentSlide();
			}
		});
	}

	private showCurrentSlide() {
		clearTimeout(this.autoplayTimer);
		this.zoneinfo = [];

		// const stored = localStorage.getItem('splitScreenList');
		// this.splitScreenList = stored ? JSON.parse(stored) : this.splitScreenList;

		if (!this.splitScreenList?.length) return;
		this.zoneinfo = this.splitScreenList[this.splitCurrentIndex]?.zonelist || [];
		const layout_time = this.splitScreenList[this.splitCurrentIndex]?.layout_duration ?? 10;
	}

	private nextSlideAndShow() {
		clearTimeout(this.autoplayTimer);
		if (!this.splitScreenList?.length) return;
		this.splitCurrentIndex = (this.splitCurrentIndex + 1) % this.splitScreenList.length;
		this.showCurrentSlide();
	}
	private toMediaSet(data: any) {
		return new Set(
			data.flatMap((layout: any) =>
				layout.zonelist.flatMap((zone: any) =>
					zone.media_list.map((m: any) => `${m.Mediafile_id}|${m.Url}`)
				)
			)
		);
	}
	private deepCopy(obj: any) {
		return JSON.parse(JSON.stringify(obj));
	}

	trackById(index: number, item: any): any {
		// safe trackBy — include index so identical ids in single-layer won't confuse Angular
		return item.id ?? index;
	}

	onZoneComplete(zoneId: any) {
		this.zoneCompletionMap[zoneId] = true;
		const allCompleted = this.zoneinfo.every(zone => this.zoneCompletionMap[zone.id]);
		console.log(this.zoneCompletionMap);
		if (allCompleted && this.splitScreen.length > 1) {
			this.nextSlideAndShow();
			this.zoneCompletionMap = {}
		}
	}

	getNetworkInfo() {
		this.authService.getNetworkInfo(this.device).subscribe((res: any) => {
			console.log(res);
		});
	}

	ngOnDestroy(): void {
		this.intervalSub?.unsubscribe();
		clearTimeout(this.autoplayTimer);
		this.subscription.unsubscribe();
		if (this.intervalId) clearInterval(this.intervalId);
	}
}