/* content-player.component.ts */
import { Component, Input, ViewChild, ElementRef, OnChanges, SimpleChanges, OnDestroy, AfterViewInit, Output, EventEmitter } from '@angular/core';
import { ToastService } from '../_core/services/toast.service';
import { YtplayerComponent } from '../_core/cell-renders/ytplayer/ytplayer.component';
import { DownloadedMedia, WebosDownloadService } from '../_core/services/webos-download.service';
import { ConnectionService, ConnectionState } from 'ng-connection-service';
import { Subscription, tap } from 'rxjs';

@Component({
	selector: 'app-content-player',
	templateUrl: './content-player.component.html',
	styleUrls: ['./content-player.component.scss']
})
export class ContentPlayerComponent implements OnChanges, AfterViewInit, OnDestroy {
	@Input() filesData: any[] = [];
	@ViewChild(YtplayerComponent) youtubePlayerComponent!: YtplayerComponent;
	@ViewChild('videoEl', { static: false }) videoElRef?: ElementRef<HTMLVideoElement>;
	@Input() splitScreen: any[] = [];
	@Input() splitScreenList: any[] = [];
	@Input() zoneId!: number;
	@Output() zoneComplete = new EventEmitter<number>();
	currentIndex = 0;
	private autoplayTimer?: any;
	private destroyed = false;
	playerRecreateKey: string | null = null;
	unsupportedCount = 0;
	totalMediaCount = 0;
	showUnsupportedOverlay = false;
	isFading = false;
	isSwitching = false;
	videoElementKey = 0;
	private activePlayingId?: number;
	isOnline = true;
	private intervalSub?: Subscription;
	private loopToken = 0;

	constructor(private toastService: ToastService, private downloadService: WebosDownloadService, private connectionService: ConnectionService) { }

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['filesData'] && changes['filesData'].currentValue) {
			// console.log("filesData :", this.filesData);
			// Stop any previous playback and ensure clean state
			this.stopPlayback();

			// If new filesData contains more than one item, ensure overlay is hidden
			if (Array.isArray(this.filesData) && this.filesData.length > 1) {
				this.showUnsupportedOverlay = false;
			}
			// this.loadMediaFiles();
			this.triggerSmoothSwitch(() => this.loadMediaFiles());
		}
	}

	ngAfterViewInit(): void { }

	private triggerSmoothSwitch(callback: () => void) {
		if (this.isSwitching) return;
		this.isSwitching = true;
		this.isFading = true;

		setTimeout(() => {
			callback();
			setTimeout(() => {
				this.isFading = false;
				setTimeout(() => (this.isSwitching = false), 400);
			}, 100);
		}, 500);
	}

	/** Ensure everything is cleaned up (timers, listeners, src) */
	private stopPlayback() {
		this.loopToken++; // invalidate previous async callbacks
		this.destroyed = true;
		clearTimeout(this.autoplayTimer);
		this.autoplayTimer = undefined;

		try {
			const videoEl = this.videoElRef?.nativeElement || document.getElementById('media-video') as HTMLVideoElement | null;
			if (videoEl) {
				videoEl.pause();
				try { videoEl.onended = null; } catch (e) { /* ignore */ }
				try { videoEl.onerror = null; } catch (e) { /* ignore */ }
				try { videoEl.removeAttribute('src'); } catch (e) { /* ignore */ }
				try { videoEl.src = ''; videoEl.load(); } catch (e) { /* ignore */ }
			}
		} catch (e) {
			/* best-effort cleanup, don't throw */
		}
		// reset flags so next load starts fresh
		this.destroyed = false;
		this.playerRecreateKey = null;
		this.unsupportedCount = 0;
	}

	private loadMediaFiles() {
		// create a new token for this "loop" so old callbacks are ignored
		this.loopToken++;
		this.filesData = this.prepareFiles(this.filesData);

		/** FIX 1 — If only 1 file and its type is neither video nor image nor pdf → unsupported */
		if (this.filesData.length === 1) {
			const f = this.filesData[0];
			if (f.type !== 'video' && f.type !== 'image' && f.type !== 'pdf') {
				this.showUnsupportedOverlay = true;
				// keep unsupportedCount/total consistent
				this.totalMediaCount = 1;
				this.unsupportedCount = 1;
				return;   // stop further playing
			}
		}
		this.currentIndex = 0;
		this.totalMediaCount = this.filesData.length;
		this.unsupportedCount = 0;
		this.showUnsupportedOverlay = false;

		const remoteList = (this.filesData || []).map(f => ({ Url: f.Url, type: f.type }));
		this.downloadService.backgroundDownloadList(remoteList);

		this.resetPlayerForYouTube();
		setTimeout(() => this.showCurrentSlide(), 120);
	}

	private prepareFiles(files: any[]): any[] {
		const downloadedMap = this.downloadService.getDownloadedMap();
		const isOffline = !navigator.onLine;

		return (files || []).map(file => {
			const remoteUrl = (file?.Url || '').toString();
			const norm = (remoteUrl || '').split('?')[0];

			// --- Skip YouTube items ALWAYS ---
			// if (remoteUrl.includes('youtube.com') || remoteUrl.includes('youtu.be')) {
			// 	console.warn(" Skipping YouTube content:", remoteUrl);
			// 	return null;
			// }

			const downloaded = downloadedMap[norm] ?? downloadedMap[remoteUrl];
			if (isOffline && !downloaded) return null;
			const playUrl = downloaded ? downloaded.url : remoteUrl;
			const lurl = (remoteUrl || '').toLowerCase();
			let type: any = 'other';
			if (lurl.includes('youtube.com') || lurl.includes('youtu.be')) type = 'youtube';
			else if (/\.(mp4|mov|avi|mkv|webm)$/i.test(lurl)) type = 'video';
			else if (/\.(jpg|jpeg|png|gif|bmp|svg|webp)$/i.test(lurl)) type = 'image';
			else if (lurl.endsWith('.pdf')) type = 'pdf';
			return { ...file, remoteUrl, Url: playUrl, type };
		}).filter(Boolean) as any[];
	}

	private handleUnsupportedFile() {
		this.unsupportedCount++;

		const total = this.totalMediaCount || this.filesData.length || 0;

		// CASE 1: only one media → show full unsupported UI
		if (total === 1) {
			this.showUnsupportedOverlay = true;
			return;
		}

		// CASE 2: multiple files but not all unsupported → show toast only
		if (this.unsupportedCount < total) {
			this.toastService.error('Unsupported file format');
			this.nextSlideAndShow();
			return;
		}

		// CASE 3: all media unsupported → show overlay
		if (this.unsupportedCount === total) {
			this.showUnsupportedOverlay = true;
		}
	}

	private isFileSupported(file: any): boolean {
		if (!file || !file.Url) return false;

		const url = file.Url.toLowerCase();

		if (file.type === 'video') {
			return url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mkv') || url.endsWith('.mov');
		}

		if (file.type === 'image') {
			return url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png') || url.endsWith('.gif');
		}

		if (file.type === 'pdf') {
			return url.endsWith('.pdf');
		}

		if (file.type === 'youtube') {
			return true; // always supported
		}

		return false; // unknown type → unsupported
	}



	private showCurrentSlide() {
		const token = this.loopToken;
		clearTimeout(this.autoplayTimer);
		const currentFile = this.filesData[this.currentIndex];
		console.log("showCurrentSlide>CurrentFile: ", currentFile)
		console.log("showCurrentSlide>Filedata: ", this.filesData)
		if (!currentFile) return;
		if (token !== this.loopToken) return; // abort if old

		// UNIVERSAL unsupported file checker (applies to ALL media types)
		if (!this.isFileSupported(currentFile)) {
			this.handleUnsupportedFile();
			return;
		}

		// If overlay is active and there's only one file (unsupported), ensure we don't try to load/play it.
		if (this.showUnsupportedOverlay && this.filesData.length === 1) {
			// keep overlay visible, don't attempt plays — nothing more to do
			return;
		}
		if (currentFile.type === 'video') {
			// prefer ViewChild reference if available
			const videoEl = this.videoElRef?.nativeElement as HTMLVideoElement | undefined
				|| document.getElementById('media-video') as HTMLVideoElement | null;

			if (!videoEl) {
				console.warn('Video element not found');
				// small retry (but guard with token)
				setTimeout(() => { if (token === this.loopToken) this.showCurrentSlide(); }, 150);
				return;
			}

			// ensure previous listeners won't interfere
			try { videoEl.onended = null; } catch (e) { /* ignore */ }
			try { videoEl.onerror = null; } catch (e) { /* ignore */ }

			videoEl.removeAttribute('src');
			// this.videoElementKey++;  // forces video element recreation
			videoEl.src = currentFile.Url;
			videoEl.currentTime = 0;
			try { videoEl.load(); } catch (e) { /* ignore */ }

			// Fallback helper for unknown durations
			const forceNext = (ms: number) => {
				this.autoplayTimer = setTimeout(() => {
					if (token !== this.loopToken) return;
					this.nextSlideAndShow();
				}, ms);
			};

			videoEl.onloadedmetadata = () => {
				if (token !== this.loopToken) return;

				const duration = videoEl.duration;
				if (!duration || isNaN(duration) || duration === Infinity) {
					// Fallback for weird metadata behavior
					forceNext(8000);
					return;
				}

				// Always start playback
				tryPlay();

				if (duration > 10 || duration < 6) {
					// ---- CASE 1: LONG VIDEO (>10 sec) ----
					// Use onended normally
					videoEl.onended = () => {
						if (token !== this.loopToken) return;
						this.nextSlideAndShow();
						try { videoEl.onended = null; } catch { }
					};
				} else {
					// ---- CASE 2: SHORT VIDEO (<=10 sec) ----
					// DO NOT USE onended (it may not fire on webOS/Tizen)
					videoEl.onended = null;

					// Trigger next slide earlier
					this.autoplayTimer = setTimeout(() => {
						if (token !== this.loopToken) return;
						this.nextSlideAndShow();
					}, (duration * 1000) + 300);
				}
			};



			let attempts = 0;
			const maxAttempts = 3;

			const tryPlay = async () => {
				attempts++;
				try {
					await videoEl.play();
					// console.log('Video started (attempt ' + attempts + ') for zone', this.zoneId);
				} catch (err) {
					console.warn(`Autoplay attempt ${attempts} failed`, err);
					if (!videoEl.muted) {
						videoEl.muted = true;
						tryPlay();
					} else if (attempts < maxAttempts) {
						setTimeout(tryPlay, 500);
					} else {
						console.error('Video cannot play after multiple attempts', err);
					}
				}
			};

			videoEl.addEventListener('canplaythrough', () => {
				if (token !== this.loopToken) return;
				tryPlay();
			}, { once: true });

			videoEl.onerror = () => {
				if (token !== this.loopToken) return;
				const mediaError = videoEl.error;
				let errorMsg = 'Unknown video error';

				if (mediaError) {
					switch (mediaError.code) {
						case mediaError.MEDIA_ERR_ABORTED:
							errorMsg = 'Video playback aborted.';
							break;
						case mediaError.MEDIA_ERR_NETWORK:
							errorMsg = 'Network error while loading video.';
							break;
						case mediaError.MEDIA_ERR_DECODE:
							errorMsg = 'Video decoding error.';
							break;
						case mediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
							errorMsg = 'Video format not supported or file missing.';
							this.unsupportedCount++;

							const total = this.totalMediaCount || this.filesData.length || 0;

							// CASE 1: only one media and it's unsupported → show full UI
							if (total === 1) {
								this.showUnsupportedOverlay = true;
								return;
							}
							// CASE 2: multiple media → show only toast, not overlay
							else if (this.unsupportedCount < total) {
								this.toastService.error('Unsupported file format');
							}
							// CASE 3: all media unsupported → show full UI
							else if (this.unsupportedCount === total) {
								this.showUnsupportedOverlay = true;
							}

							this.nextSlideAndShow();
							break;

					}
				}

				console.error('Video failed to load', {
					src: videoEl.currentSrc || currentFile.Url,
					error: errorMsg,
				});

				// keep your existing toast for all other errors
				if (mediaError && mediaError.code !== mediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
					this.toastService.error(errorMsg);
				}

			};

		} else if (currentFile.type === 'image') {
			this.autoplayTimer = setTimeout(() => {
				if (token !== this.loopToken) return;
				this.nextSlideAndShow();
			}, 10000);
		} else if (currentFile.type === 'youtube') {
			if (!this.isOnline) {
				this.nextSlideAndShow();
			}
			this.resetPlayerForYouTubeForCurrentIndex();
		} else if (currentFile.type === 'pdf') {

		} else {
			// unknown file type — treat as "other" (show toast + skip) unless single -> overlay already handled in loadMediaFiles
			if (this.filesData.length === 1) {
				// single and unknown → show overlay (should have been handled earlier)
				this.showUnsupportedOverlay = true;
				return;
			}
			this.toastService.error('Unsupported file format');
			this.nextSlideAndShow();
		}
	}

	private nextSlideAndShow() {
		const token = this.loopToken;
		clearTimeout(this.autoplayTimer);
		/** FIX 2 — If only 1 media and it's unsupported, do NOT loop/flicker */
		if (this.filesData.length === 1 && this.showUnsupportedOverlay) {
			return;
		}
		if (!this.filesData || this.filesData.length === 0) return;
		const isLastMedia = this.currentIndex === this.filesData.length - 1;

		if (isLastMedia) {
			this.zoneComplete.emit(this.zoneId);
		}

		if (this.filesData.length > 1) {
			this.currentIndex = (this.currentIndex + 1) % this.filesData.length;
			this.resetPlayerForYouTubeForCurrentIndex();
			// console.log("Next Slide Index:", this.currentIndex);
			// console.log(this.currentIndex);
			setTimeout(() => {
				if (token !== this.loopToken) return;
				this.showCurrentSlide();
			}, 80);
		}
	}

	onVideoEnded(event: { success?: boolean; message?: string } = { success: true }, type: any) {
		if (event && event.success === false && event.message) {
			this.toastService.error(event.message);
		}
		// console.log(event);
		this.nextSlideAndShow();
	}

	private resetPlayerForYouTube() {
		this.playerRecreateKey = null;
		setTimeout(() => (this.playerRecreateKey = this.generateKey()), 60);
	}

	private resetPlayerForYouTubeForCurrentIndex() {
		if (this.filesData[this.currentIndex]?.type === 'youtube') this.resetPlayerForYouTube();
		else this.playerRecreateKey = null;
	}

	private generateKey(): string {
		const file = this.filesData[this.currentIndex];
		const url = file?.remoteUrl || '';
		return `${url}_${this.currentIndex}_${Date.now()}`;
	}

	private guessTypeFromUrl(url: string): DownloadedMedia['type'] {
		const u = (url || '').toLowerCase();
		if (!u) return 'other';
		if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
		if (u.endsWith('.pdf')) return 'pdf';
		if (u.match(/\.(mp4|mov|webm|mkv|avi)$/)) return 'video';
		if (u.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/)) return 'image';
		return 'other';
	}

	ngOnDestroy(): void {
		this.stopPlayback();
		this.intervalSub?.unsubscribe();
		clearTimeout(this.autoplayTimer);
	}
}