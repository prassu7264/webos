
//bcsdfs/* content-player.component.ts */
import { Component, Input, ViewChild, ElementRef, OnChanges, SimpleChanges, OnDestroy, AfterViewInit, Output, EventEmitter } from '@angular/core';
import { ToastService } from '../_core/services/toast.service';
import { YtplayerComponent } from '../_core/cell-renders/ytplayer/ytplayer.component';
import { DownloadedMedia, WebosDownloadService } from '../_core/services/webos-download.service';

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

	constructor(private toastService: ToastService, private downloadService: WebosDownloadService) { }

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['filesData'] && changes['filesData'].currentValue) {

			const newFiles = changes['filesData'].currentValue;
			const previousFiles = changes['filesData'].previousValue;

			// 1. Prevent running when empty
			if (!newFiles || newFiles.length === 0) {
				 console.log(newFiles)
				 console.log(previousFiles)
				return; 
			}

			// 2. Prevent re-loading if same data comes again
			if (previousFiles && JSON.stringify(newFiles) === JSON.stringify(previousFiles)) {
				return; // Same data received → do nothing
			}

			// 3. Otherwise proceed normally
			this.triggerSmoothSwitch(() => this.loadMediaFiles());
		}
	}


	ngAfterViewInit(): void {
		// reserved for future
	}

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

	private loadMediaFiles() {
		this.filesData = this.prepareFiles(this.filesData);
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
			const downloaded = downloadedMap[norm] ?? downloadedMap[remoteUrl];
			if (isOffline && !downloaded) return null;

			const playUrl = downloaded ? downloaded.url : remoteUrl;
			const lurl = (remoteUrl || '').toLowerCase();
			let type: any = 'other';
			if (/\.(mp4|mov|avi|mkv|webm)$/i.test(lurl)) type = 'video';
			else if (/\.(jpg|jpeg|png|gif|bmp|svg|webp)$/i.test(lurl)) type = 'image';
			else if (lurl.endsWith('.pdf')) type = 'pdf';
			return { ...file, remoteUrl, Url: playUrl, type };
		}).filter(Boolean) as any[];
	}

	private showCurrentSlide() {
		clearTimeout(this.autoplayTimer);
		const currentFile = this.filesData[this.currentIndex];
		if (!currentFile) return;

		if (!Number(currentFile.Mediafile_id)) currentFile.Mediafile_id = Date.now();

		if (currentFile.type === 'video') {
			setTimeout(() => {
				const videoEl = document.getElementById('media-video') as HTMLVideoElement;
				if (!videoEl) {
					console.warn('Video element not found');
					return;
				}
				videoEl.pause();
				videoEl.removeAttribute('src');
				videoEl.src = currentFile.Url;
				videoEl.currentTime = 0;
				videoEl.load();

				videoEl.onended = () => {
					this.nextSlideAndShow();
					videoEl.onended = null;
				};

				let attempts = 0;
				const maxAttempts = 3;

				const tryPlay = async () => {
					attempts++;
					try {
						await videoEl.play();
						console.log('Video started (attempt ' + attempts + ')');
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

				videoEl.addEventListener('canplaythrough', tryPlay, { once: true });

				videoEl.onerror = null;
				videoEl.onerror = () => {
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
			});
		} else if (currentFile.type === 'image') {
			this.autoplayTimer = setTimeout(() => this.nextSlideAndShow(), 10000);
		} else if (currentFile.type === 'youtube') {
			this.nextSlideAndShow();
			this.resetPlayerForYouTubeForCurrentIndex();
		} else if (currentFile.type === 'pdf') {
		} else {
			this.autoplayTimer = setTimeout(() => this.nextSlideAndShow(), 10000);
		}
	}

	private nextSlideAndShow() {
		clearTimeout(this.autoplayTimer);
		if (!this.filesData || this.filesData.length === 0) return;

		const isLastMedia = this.currentIndex === this.filesData.length - 1;

		if (isLastMedia) {
			this.zoneComplete.emit(this.zoneId);
		}

		if (this.filesData.length > 1) {
			this.currentIndex = (this.currentIndex + 1) % this.filesData.length;
			this.resetPlayerForYouTubeForCurrentIndex();
			// console.log("Next Slide Index:", this.currentIndex);
			console.log(this.currentIndex);

			setTimeout(() => this.showCurrentSlide(), 80);
		}
	}


	nextSlide() {
		clearTimeout(this.autoplayTimer);
		if (!this.filesData || !this.filesData.length) return;
		this.currentIndex = (this.currentIndex + 1) % this.filesData.length;
		this.resetPlayerForYouTubeForCurrentIndex();
		setTimeout(() => this.showCurrentSlide(), 80);
	}

	onVideoEnded(event: { success?: boolean; message?: string } = { success: true }) {
		if (event && event.success === false && event.message) {
			this.toastService.error(event.message);
		}
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
		clearTimeout(this.autoplayTimer);
		this.destroyed = true;
	}
}