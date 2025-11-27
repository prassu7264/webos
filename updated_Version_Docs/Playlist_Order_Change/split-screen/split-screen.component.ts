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
	noMediaAvailable = false;
	private lastMediaType: string | null = null;
	private pendingLayout: any[] | null = null;
	private wasNoMedia = false;
	private skipSourceChangedOnce = false;
	rebuildScroller = true;


	// NEW: map to control whether each zone's <app-content-player> is rendered.
	showPlayerMap: { [zoneId: number]: boolean } = {};

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

		this.intervalSub = interval(3000).subscribe(() => {
			if (this.device.androidid) {
				this.isExistedDevice(this.device.androidid);
				this.checkForUpdates();
			}
		});

		history.pushState(null, '', window.location.href);
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


				// Force immediate playlist refetch & apply (user requested immediate change on orientation)
				this.loadMediaFiles();
			}
		});
	}

	openOffline() {
		this.router.navigate(['/offline-player']);
	}

	private loadMediaFiles() {
		this.authService.getMediafiles(this.device).subscribe((res: any) => {
			const layoutList = res?.layout_list ?? [];
			this.updatedTime = res.updated_time;
			this.splitScreen = this.deepCopy(layoutList);
			this.splitScreenList = this.deepCopy(layoutList);
			this.scrollers = res?.scrollerList || [];
			this.topScrollers = this.scrollers.filter(s => s.type === 'TOP');
			this.bottomScrollers = this.scrollers.filter(s => s.type === 'BOTTOM');
			this.splitCurrentIndex = 0;

			// --- USE REUSABLE FUNCTION ---
			if (this.checkNoMedia(layoutList)) {
				this.noMediaAvailable = true;
				this.wasNoMedia = true;
				return;
			}
			// --- MEDIA EXISTS ---
			this.noMediaAvailable = false;
			// Only start player IF it's normal load, not recovery from no-media
			if (!this.wasNoMedia) {
				this.showCurrentSlide();  // start only once
			}
		});
	}

	private checkNoMedia(layoutList: any[]): boolean {
		// --- NO LAYOUTS ---
		if (!layoutList || layoutList.length === 0) {
			return true;
		}
		// --- COLLECT ZONES ---
		let allZones: any[] = [];
		layoutList.forEach((l: any) => {
			if (Array.isArray(l.zonelist)) {
				allZones = [...allZones, ...l.zonelist];
			}
		});

		// --- FILTER ZONES THAT HAVE MEDIA ---
		const validZones = allZones.filter(z =>
			Array.isArray(z.media_list) && z.media_list.length > 0
		);

		// RESULT
		return validZones.length === 0;
	}

	private getScrollerSignature(list: any[]) {
		return list
			.map(s => ({
				id: s.id || "",
				msg: s.message || "",
				font: s.fontname || "",
				folder: s.font_folder || "",
				speed: s.scrlspeed || "",
				type: s.type || "",
				color: s.fncolor || "",
				bg: s.bgcolor || "",
				size: s.fnsize || ""
			}))
			.map(s => JSON.stringify(s))
			.join("|");
	}


	private checkForUpdates() {
		this.authService.getMediafiles(this.device).subscribe((res: any) => {
			const newLayout = res?.layout_list ?? [];
			const newMediaType = res?.media_type ?? null;
			const newScrollers = res?.scrollerList || res?.scrollermessage || res?.tickerList || [];
			const noMedia = this.checkNoMedia(newLayout);


			// --- 1. Scrollers update ---
			// --- 1. Scrollers update ---

			const oldSig = this.getScrollerSignature(this.scrollers);
			const newSig = this.getScrollerSignature(newScrollers);
			if (oldSig !== newSig) {

				console.warn("SCROLLER UPDATED → Full DOM rebuild");

				this.rebuildScroller = false;

				this.scrollers = newScrollers;
				this.topScrollers = newScrollers.filter((s: any) => s.type === 'TOP');
				this.bottomScrollers = newScrollers.filter((s: any) => s.type === 'BOTTOM');

				setTimeout(() => {
					this.rebuildScroller = true;
				}, 0);

			} else {
				// No actual change → DO NOTHING → Prevent restart
			}

			// --- 0. Check NO MEDIA ---
			if (noMedia) {
				this.noMediaAvailable = true;
				clearTimeout(this.autoplayTimer);
				this.autoplayTimer = null;
				this.splitScreen = [];
				this.splitScreenList = [];
				this.zoneinfo = [];
				this.zoneCompletionMap = {};
				this.showPlayerMap = {};
				this.wasNoMedia = true;   // mark state!
				return;
			}

			this.noMediaAvailable = false;

			//  IMPORTANT PART 
			if (this.wasNoMedia) {
				// STOP ANY old loop fully
				clearTimeout(this.autoplayTimer);
				this.autoplayTimer = null;
				console.warn("MEDIA RESTORED → CLEAN RESTART");
				this.wasNoMedia = false;
				this.skipSourceChangedOnce = true;
				// RESET state
				this.splitCurrentIndex = 0;
				this.zoneCompletionMap = {};
				this.showPlayerMap = {};
				this.pendingLayout = null;
				this.updatedTime = res.updated_time;
				// LOAD new layout
				this.splitScreen = this.deepCopy(newLayout);
				this.splitScreenList = this.deepCopy(newLayout);
				// START NEW LOOP
				this.showCurrentSlide();
				return;
			}


			// --- 2. Detect order change (using signature) ---
			const oldSignature = this.getPlaylistSignature(this.splitScreen);
			const newSignature = this.getPlaylistSignature(newLayout);
			const orderChanged = oldSignature !== newSignature;
			// --- 3. Detect DEFAULT → SERVER DEFAULT change ---
			const sourceChanged = this.lastMediaType !== null && this.lastMediaType !== newMediaType;
			// Store latest value
			this.lastMediaType = newMediaType;

			// --------------------------
			// CASE A: SOURCE CHANGED
			// --------------------------
			// If we JUST recovered from NO MEDIA → ignore this one
			if (this.skipSourceChangedOnce) {
				console.warn("Ignoring sourceChanged because of NO MEDIA recovery");
				this.skipSourceChangedOnce = false; // reset for next time
				return;
			}

			if (sourceChanged) {
				console.warn("SOURCE changed → IMMEDIATE SWITCH");
				clearTimeout(this.autoplayTimer);
				this.splitScreen = this.deepCopy(newLayout);
				this.splitScreenList = this.deepCopy(newLayout);
				this.updatedTime = res.updated_time;
				this.splitCurrentIndex = 0;
				this.showCurrentSlide();
				return;
			}

			// --------------------------
			//  CASE B: ORDER CHANGED
			// --------------------------
			if (orderChanged) {
				console.warn("Playlist ORDER changed → will apply AFTER loop");

				// Store layout to apply later
				this.pendingLayout = this.deepCopy(newLayout);
				return; //  Do NOT interrupt current loop
			}
		});
	}

	private getPlaylistSignature(layout: any[]): string {
		return layout
			.map((l: any) =>
				l.zonelist
					.map((z: any) =>
						z.media_list
							.map((m: any) => `${m.Mediafile_id}-${m.Order_id}`)
							.join('|')
					)
					.join('#')
			)
			.join('||');
	}

	private applyPendingPlaylistUpdate() {
		if (!this.pendingLayout) return;
		console.warn("APPLYING PENDING PLAYLIST UPDATE…");
		this.splitScreen = this.deepCopy(this.pendingLayout);
		this.splitScreenList = this.deepCopy(this.pendingLayout);
		this.pendingLayout = null;
	}

	private showCurrentSlide() {
		clearTimeout(this.autoplayTimer);
		this.zoneinfo = [];
		if (!this.splitScreenList?.length) return;
		this.zoneinfo = this.splitScreenList[this.splitCurrentIndex]?.zonelist || [];
		// FORCE re-creation of child <app-content-player> to guarantee old instance is destroyed
		// quick false->true toggle for each zone id in current zoneinfo
		for (const z of this.zoneinfo) {
			const id = z.id;
			// If zone is single item and it's unsupported, keep player alive (do not toggle)
			const mediaList = Array.isArray(z.media_list) ? z.media_list : [];
			if (mediaList.length === 1) {
				const t = this.guessTypeFromUrl(mediaList[0]?.Url || mediaList[0]?.url || '');
				if (t !== 'video' && t !== 'image' && t !== 'pdf') {
					// Ensure player remains (don't mark false)
					this.showPlayerMap[id] = true;
					continue;
				}
			}
			// otherwise mark false first to ensure destruction, then set true next tick
			this.showPlayerMap[id] = false;
		}
		// next tick (small delay) set them true to re-create component instances
		setTimeout(() => {
			for (const z of this.zoneinfo) {
				// if previously kept true (single unsupported) we skip override; otherwise set true
				const id = z.id;
				if (!this.showPlayerMap[id]) {
					this.showPlayerMap[id] = true;
				}
			}
		}, 50);
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
		const mediaSignature = item?.media_list?.map((m: any) => m?.Url || '').join('|');
		return item.id + '_' + mediaSignature;
	}


	onZoneComplete(zoneId: any) {
		this.zoneCompletionMap[zoneId] = true;
		const allCompleted = this.zoneinfo.every(z => this.zoneCompletionMap[z.id]);
		if (!allCompleted) return;
		const isLastSlide = this.splitCurrentIndex === this.splitScreen.length - 1;

		// -----------------------------------------
		//  CASE 1: We reached end of loop
		// -----------------------------------------
		if (isLastSlide) {
			//  If pending layout exists, apply now
			if (this.pendingLayout) {
				console.warn("🎬 APPLYING NEW PLAYLIST AT LOOP END");
				this.applyPendingPlaylistUpdate();
			}
			// Restart playlist from first slide
			this.splitCurrentIndex = 0;
			this.zoneCompletionMap = {};
			this.showCurrentSlide();
			return;
		}

		// -----------------------------------------
		// CASE 2: Mid-loop → move to next slide
		// -----------------------------------------
		this.zoneCompletionMap = {};
		this.nextSlideAndShow();
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
	private guessTypeFromUrl(url: string): string {
		const u = (url || '').toLowerCase();
		if (!u) return 'other';
		if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
		if (u.endsWith('.pdf')) return 'pdf';
		if (u.match(/\.(mp4|mov|webm|mkv|avi)$/)) return 'video';
		if (u.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/)) return 'image';
		return 'other';
	}
}