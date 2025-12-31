import { Component, Input, ViewChild, OnChanges, SimpleChanges, Output, EventEmitter, ElementRef } from '@angular/core';
import { Subscription, tap } from 'rxjs';
import { ToastService } from '../_core/services/toast.service';
import { YtplayerComponent } from '../_core/cell-renders/ytplayer/ytplayer.component';
import { FilesystemService } from '../_core/services/filesystem.service';
import { ConnectionService, ConnectionState } from 'ng-connection-service';
import { LoggerService } from '../_core/services/logger.service';


@Component({
	selector: 'app-content-player',
	templateUrl: './content-player.component.html',
	styleUrls: ['./content-player.component.scss']
})
export class ContentPlayerComponent implements OnChanges {
	device: any;
	subscription = new Subscription();
	@Input() filesData: any[] = [];
	@Input() splitScreenList: any[] = [];
	private intervalSub?: Subscription;
	@ViewChild(YtplayerComponent) youtubePlayerComponent!: YtplayerComponent;
	@ViewChild('videoEl') videoElRef!: ElementRef<HTMLVideoElement>;
	currentIndex: number = 0;
	private autoplayTimer?: any;
	@Input() zoneId!: number;
	@Output() zoneComplete = new EventEmitter<number>();
	playerRecreateKey: string | null = null;
	isOnline = true;
	private activePlayingId?: number;
	private videoZoneCompletedOnce = false;
	forSplitscreenVideoloop = false;
	constructor(private toastService: ToastService, private fsService: FilesystemService, private connectionService: ConnectionService, private logger: LoggerService) {
		this.logger.info('ContentPlayer.constructor', 'Component created');
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['filesData'] && changes['filesData'].currentValue) {
			this.logger.info('ngOnChanges', 'filesData changed', {
				length: this.filesData?.length,
				zoneId: this.zoneId
			});
			this.loadMediaFiles();

		}
	}

	ngOnInit(): void {
		this.logger.info('ngOnInit', 'ContentPlayer initialized', {
			zoneId: this.zoneId
		});
		this.loadMediaFiles();
		this.connectionService.monitor().pipe(
			tap((newState: ConnectionState) => {
				const currentFile = this.filesData[this.currentIndex];
				this.isOnline = newState.hasNetworkConnection;
				this.logger.log('Connection', 'Network state changed', {
					online: this.isOnline,
					zoneId: this.zoneId
				});
			})
		).subscribe();
	}

	ngOnDestroy(): void {
		this.logger.warn('ngOnDestroy', 'ContentPlayer destroyed', {
			zoneId: this.zoneId
		});
		this.intervalSub?.unsubscribe();
		clearTimeout(this.autoplayTimer);
		this.filesData = [];
	}

	private loadMediaFiles() {
		this.logger.info('loadMediaFiles', 'Preparing media list', {
			originalCount: this.filesData?.length,
			zoneId: this.zoneId
		});

		this.filesData = this.prepareFiles(this.filesData);
		this.currentIndex = 0;

		this.logger.info('loadMediaFiles', 'Filtered media list', {
			preparedCount: this.filesData.length,
			types: this.filesData.map(f => f.type)
		});

		this.resetPlayerForYouTube();
		setTimeout(() => {
			this.showCurrentSlide();
		}, 120);


		this.processFilesWithDelay()
	}
	async processFilesWithDelay() {
		for (const file of this.filesData) {
			if (
				file?.type !== 'youtube' &&
				this.fsService.detectPlatform() === 'tizen' &&
				(!file?.downloadedUrl || !file.downloadedUrl.trim().startsWith('file:///'))
			) {
				await this.downloadAndSaveFile(file);

				// Add delay (e.g., 2 seconds)
				await this.delay(2000);
			}
		}
	}
	delay(ms: number) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
	private prepareFiles(files: any[]): any[] {
		const videoExt = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
		const imageExt = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
		const pdfExt = ['pdf'];

		return (files || [])
			.map(file => {
				const url = (file?.Url || '').toString();
				const lurl = url.toLowerCase();
				let type = 'other';

				if (lurl.includes('youtube.com') || lurl.includes('youtu.be')) {
					type = 'youtube';
				} else if (videoExt.some(ext => lurl.endsWith('.' + ext))) {
					type = 'video';
				} else if (imageExt.some(ext => lurl.endsWith('.' + ext))) {
					type = 'image';
				} else if (pdfExt.some(ext => lurl.endsWith('.' + ext))) {
					type = 'pdf';
				}

				return { ...file, type };
			})
			.filter(file => file.type !== 'other');
	}

	private showCurrentSlide() {
		clearTimeout(this.autoplayTimer);
		const currentFile = this.filesData[this.currentIndex];
		if (!currentFile) {
			this.logger.warn('showCurrentSlide', 'No media found', {
				index: this.currentIndex,
				zoneId: this.zoneId
			});

			return;
		}

		if (!Number(currentFile.Mediafile_id)) {
			currentFile.Mediafile_id = Date.now();
		}
		console.log("Showing file:", this.currentIndex, currentFile);
		this.activePlayingId = currentFile.Mediafile_id;

		this.logger.info('showCurrentSlide', 'Playing media', {
			index: this.currentIndex,
			type: currentFile.type,
			mediaId: currentFile.Mediafile_id,
			zoneId: this.zoneId
		});

		if (currentFile.type === 'video') {
			// const videoEl = document.getElementById('media-video') as HTMLVideoElement;
			const videoEl = this.videoElRef?.nativeElement;

			if (!videoEl) {
				this.logger.error('Video', 'Video element not found', this.zoneId);
				return;
			}
			videoEl.removeAttribute('src');
			videoEl.src = currentFile.downloadedUrl || currentFile.Url;
			videoEl.currentTime = 0;
			const zones = this.splitScreenList?.find(l => l.zonelist?.some((z: any) => z.id === this.zoneId))?.zonelist || [];
			const videoZone = zones.find((z: any) => z.media_list?.some((m: any) => m.Filename?.toLowerCase().endsWith('.mp4')));
			const maxZoneDuration = Math.max(...zones.map((z: any) => Number(z.zone_duration)));

			// ✅ EMIT ZONE COMPLETE ONCE (even if video loops)
			if (videoZone && Number(videoZone.zone_duration) < maxZoneDuration && !this.videoZoneCompletedOnce) {
				this.videoZoneCompletedOnce = true;

				setTimeout(() => {
					console.log('✅ video zone completed (time based)');
					this.zoneComplete.emit(this.zoneId);
					videoEl.loop = true;
				}, Number(videoZone.zone_duration) * 1000);
			}


			// videoEl.load();
			videoEl.onended = () => {
				this.logger.info('Video', 'Video ended', {
					mediaId: currentFile.Mediafile_id,
					zoneId: this.zoneId
				});
				this.nextSlideAndShow();
				videoEl.onended = null;
			};


			let attempts = 0;
			const maxAttempts = 3;
			const tryPlay = async () => {
				attempts++;
				try {
					await videoEl.play();
					console.log('✅ Video started (attempt ' + attempts + ')');
				} catch (err) {
					console.log(`⚠️ Autoplay attempt ${attempts} failed`, err);
					if (!videoEl.muted) {
						videoEl.muted = true;
						tryPlay();
					} else if (attempts < maxAttempts) {
						setTimeout(tryPlay, 2000);
					} else {
						console.error('Video cannot play after multiple attempts', err);

					}
				}
			};

			videoEl.addEventListener('canplaythrough', tryPlay, { once: true });
			videoEl.onerror = null;

			videoEl.onerror = () => {
				const mediaError = videoEl.error;

				this.logger.error('Video', 'Video playback failed', {
					src: videoEl.currentSrc || currentFile.Url,
					errorCode: mediaError?.code,
					zoneId: this.zoneId
				});

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
							if (currentFile?.downloadedUrl && currentFile?.downloadedUrl?.startsWith("file://")) {
								const tizenPath = currentFile.downloadedUrl;
								this.fsService.deleteFile(tizenPath)
									.then(() => {
										console.log("Deleted file:", tizenPath);
									})
									.catch(err => {
										console.error("Failed to delete file:", tizenPath, err);
									});
							}
							this.nextSlideAndShow();
							break;
					}
				}

				console.error('Video failed to load', { src: videoEl.currentSrc || currentFile.Url, error: errorMsg, });

				this.toastService.error(errorMsg);
			};
		}
		else if (currentFile.type === 'image') {
			let delayMs = 10000; // default content-player behavior

			this.logger.info('Image', 'Image displayed', {
				delay: delayMs,
				zoneId: this.zoneId
			});

			const isPendriveMode = sessionStorage.getItem('ModeConfiguration') === 'true';


			if (isPendriveMode) {
				const pendriveDelay = Number(localStorage.getItem('imageDelay'));
				delayMs = (pendriveDelay > 0 ? pendriveDelay : 10) * 1000;
			}

			console.log('🖼️ Image delay:', delayMs, 'ms', 'Pendrive:', isPendriveMode);

			this.autoplayTimer = setTimeout(() => {
				this.nextSlideAndShow();
			}, delayMs);
		} else if (currentFile.type === 'youtube') {
			this.logger.info('YouTube', 'YouTube media selected', {
				online: this.isOnline,
				zoneId: this.zoneId
			});

			if (!this.isOnline) {
				this.nextSlideAndShow();
			}
			this.resetPlayerForYouTubeForCurrentIndex();
		} else if (currentFile.type === 'pdf') {
			this.logger.info('PDF', 'PDF displayed', {
				zoneId: this.zoneId
			});
			//Nothing to change here
		} else {
			this.autoplayTimer = setTimeout(() => this.nextSlideAndShow(), 10000);
		}
	}


	private nextSlideAndShow() {
		clearTimeout(this.autoplayTimer);
		if (!this.filesData.length) return;

		const isLastMedia = this.currentIndex === this.filesData.length - 1;

		if (isLastMedia) {
			this.zoneComplete.emit(this.zoneId);
		}

		if (this.filesData.length > 1) {
			this.currentIndex = (this.currentIndex + 1) % this.filesData.length;
			this.resetPlayerForYouTubeForCurrentIndex();
			setTimeout(() => this.showCurrentSlide(), 80);
		}

	}

	onVideoEnded(event: { success: boolean; message?: string }, type: any) {
		if (!event.success && event.message) {
			this.toastService.error(event.message);
		}
		// console.log(event);

		this.nextSlideAndShow();
	}


	private resetPlayerForYouTube() {
		this.playerRecreateKey = null;
		setTimeout(() => {
			this.playerRecreateKey = this.generateKey();
		}, 60);
	}

	private resetPlayerForYouTubeForCurrentIndex() {

		if (this.filesData[this.currentIndex]?.type === 'youtube') {
			this.resetPlayerForYouTube();
		} else if (this.filesData[this.currentIndex]?.type === 'video') {
			this.resetPlayerForYouTube();
		} else {
			this.playerRecreateKey = null;
		}
	}

	private generateKey(): string {

		const file = this.filesData[this.currentIndex];
		const url = file?.Url || '';
		return `${url}_${this.currentIndex}_${Date.now()}`;
	}


	private async downloadAndSaveFile(media: any) {
		try {
			if (this.activePlayingId === media.Mediafile_id) {
				this.logger.warn('Download', 'Skipping active media download', {
					mediaId: media.Mediafile_id
				});
				setTimeout(() => this.downloadAndSaveFile(media), 10000);
				return;
			}


			this.logger.info('Download', 'Downloading media', {
				file: media.Filename
			});

			const result = await this.fsService.downloadFile(media.Url, 'downloads', media.Filename);
			if (result && !result.startsWith("https://")) {
				media.downloadedUrl = result.startsWith("file://") ? result	: "file://" + result;
			}
			this.saveDownloadedFile(media);
		} catch (err) {
			console.error(`Failed to download ${media.Filename}`, err);
		}
	}

	private saveDownloadedFile(file: any) {

		if (!file?.Mediafile_id || !file?.downloadedUrl) return;


		// Update filesData
		this.filesData = this.filesData.map(ffile =>
			ffile.Mediafile_id === file.Mediafile_id && file?.downloadedUrl?.startsWith("file://")
				? { ...ffile, downloadedUrl: file.downloadedUrl, isDownloading: false }
				: ffile
		);

		// Update splitScreenList
		for (let layout of this.splitScreenList) {
			for (let zone of layout.zonelist) {
				for (let m of zone.media_list) {
					if (m.Mediafile_id === file.Mediafile_id && file?.downloadedUrl?.startsWith("file://")) {
						m.downloadedUrl = file.downloadedUrl;
					}
				}
			}
		}

		// Save to localStorage
		localStorage.setItem("splitScreenList", JSON.stringify(this.splitScreenList));

		// console.log("splitScreenList after update:", this.splitScreenList);
	}

}