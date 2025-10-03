// import { Component, Input, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
// import { Subscription } from 'rxjs';
// import { ToastService } from '../_core/services/toast.service';
// import { YtplayerComponent } from '../_core/cell-renders/ytplayer/ytplayer.component';
// import { DownloadedMedia, WebosDownloadService } from '../_core/services/webos-download.service';


// @Component({
// 	selector: 'app-content-player',
// 	templateUrl: './content-player.component.html',
// 	styleUrls: ['./content-player.component.scss']
// })
// export class ContentPlayerComponent implements OnChanges {
// 	device: any;
// 	@Input() filesData: any[] = [];

// 	private intervalSub?: Subscription;
// 	@ViewChild(YtplayerComponent) youtubePlayerComponent!: YtplayerComponent;
// 	currentIndex: number = 0;
// 	private autoplayTimer?: any;

// 	// key used to force recreate the YT component when needed
// 	playerRecreateKey: string | null = null;

// 	constructor(private toastService: ToastService, private downloadService: WebosDownloadService) { }

// 	ngOnChanges(changes: SimpleChanges): void {
// 		// If the incoming filesData changed (order changed), reprepare and restart
// 		if (changes['filesData'] && changes['filesData'].currentValue) {
// 			this.loadMediaFiles();
// 		}
// 	}

// 	ngOnInit(): void {
// 		console.log(this.filesData);
// 		this.loadMediaFiles();
// 	}

// 	ngOnDestroy(): void {
// 		this.intervalSub?.unsubscribe();
// 		clearTimeout(this.autoplayTimer);
// 	}

// 	private loadMediaFiles() {
// 		this.filesData = this.prepareFiles(this.filesData);
// 		this.currentIndex = 0;
// 		// trigger download for all media
// 		this.downloadAllMedia();

// 		// When playlist changes we want to ensure any existing youtube iframe is destroyed and recreated
// 		this.resetPlayerForYouTube();

// 		// Give Angular and the browser a little time to tear down old iframes, then start
// 		setTimeout(() => {
// 			this.showCurrentSlide();
// 		}, 120);
// 	}

// 	private prepareFiles(files: any[]): any[] {
// 		return (files || [])
// 			.map(file => {
// 				const remoteUrl = (file?.Url || '').toString();
// 				const downloaded = this.downloadService.findDownloaded(remoteUrl);

// 				// Always keep remote URL, decide playUrl later
// 				const playUrl = navigator.onLine
// 					? remoteUrl
// 					: downloaded
// 						? downloaded.localPath
// 						: remoteUrl;

// 				const lurl = remoteUrl.toLowerCase();
// 				let type = 'other';

// 				if (lurl.includes('youtube.com') || lurl.includes('youtu.be')) {
// 					type = 'youtube';
// 				} else if (/\.(mp4|mov|avi|mkv|webm)$/i.test(lurl)) {
// 					type = 'video';
// 				} else if (/\.(jpg|jpeg|png|gif|bmp|svg|webp)$/i.test(lurl)) {
// 					type = 'image';
// 				} else if (lurl.endsWith('.pdf')) {
// 					type = 'pdf';
// 				}

// 				return { ...file, remoteUrl, Url: playUrl, type };
// 			})
// 			.filter(file => file.type !== 'other');
// 	}



// 	private showCurrentSlide() {
// 		clearTimeout(this.autoplayTimer);
// 		const currentFile = this.filesData[this.currentIndex];
// 		if (!currentFile) return;

// 		// recompute playUrl each time we show a file
// 		const downloaded = this.downloadService.findDownloaded(currentFile.remoteUrl);
// 		const playUrl = navigator.onLine
// 			? currentFile.remoteUrl
// 			: downloaded
// 				? downloaded.localPath
// 				: currentFile.remoteUrl;

// 		console.log("Showing file:", this.currentIndex, currentFile, "using", playUrl);

// 		if (currentFile.type === 'video') {
// 			setTimeout(() => {
// 				const videoEl = document.getElementById('media-video') as HTMLVideoElement;
// 				if (videoEl) {
// 					videoEl.src = playUrl;   //  always refresh src here
// 					videoEl.load();
// 					videoEl.play().catch(err => console.warn("Autoplay blocked:", err));
// 					videoEl.onended = () => this.nextSlideAndShow();
// 				}
// 			});
// 		} else if (currentFile.type === 'image') {
// 			// Just set src attribute via template binding, works fine
// 			this.autoplayTimer = setTimeout(() => this.nextSlideAndShow(), 10000);
// 		} else if (currentFile.type === 'youtube') {
// 			this.resetPlayerForYouTubeForCurrentIndex();
// 		} else if (currentFile.type === 'pdf') {
// 			// pdf viewer will emit pdfEnded
// 		} else {
// 			this.autoplayTimer = setTimeout(() => this.nextSlideAndShow(), 10000);
// 		}
// 	}


// 	/**
// 	 * Go to next slide and display it
// 	 */
// 	private nextSlideAndShow() {
// 		clearTimeout(this.autoplayTimer); // safety
// 		if (!this.filesData.length) return;
// 		this.currentIndex = (this.currentIndex + 1) % this.filesData.length;

// 		// For youtube ensure the YT component is recreated for the new index
// 		this.resetPlayerForYouTubeForCurrentIndex();

// 		// small delay to allow destroy/create
// 		setTimeout(() => this.showCurrentSlide(), 80);
// 		console.log(this.currentIndex);
// 	}

// 	/**
// 	 * Manual navigation (e.g., next button)
// 	 */
// 	nextSlide() {
// 		clearTimeout(this.autoplayTimer);
// 		if (!this.filesData.length) return;
// 		this.currentIndex = (this.currentIndex + 1) % this.filesData.length;
// 		this.resetPlayerForYouTubeForCurrentIndex();
// 		setTimeout(() => this.showCurrentSlide(), 80);
// 	}

// 	onVideoEnded(event: { success: boolean; message?: string }) {
// 		if (!event.success && event.message) {
// 			this.toastService.error(event.message);
// 			console.log("Embedded Video Not Allowed!")
// 		}
// 		this.nextSlideAndShow();
// 	}

// 	/**
// 	 * Force recreation of the YouTube player component by toggling playerRecreateKey
// 	 * Used when playlist/order/index changes so the iframe is built fresh (avoids black-screen).
// 	 */
// 	private resetPlayerForYouTube() {
// 		// change key to null so *ngIf will destroy the player, then set a new key
// 		this.playerRecreateKey = null;
// 		setTimeout(() => {
// 			this.playerRecreateKey = this.generateKey();
// 		}, 60);
// 	}

// 	private resetPlayerForYouTubeForCurrentIndex() {
// 		// Only toggle if current item is youtube
// 		if (this.filesData[this.currentIndex]?.type === 'youtube') {
// 			this.resetPlayerForYouTube();
// 		} else {
// 			// if it's not youtube, ensure playerRecreateKey is null so no stale player remains
// 			this.playerRecreateKey = null;
// 		}
// 	}

// 	private generateKey(): string {
// 		// Use video URL + index + timestamp as unique key
// 		const file = this.filesData[this.currentIndex];
// 		const url = file?.Url || '';
// 		return `${url}_${this.currentIndex}_${Date.now()}`;
// 	}



// 	private downloadAllMedia() {
// 		if (!this.filesData || !this.filesData.length) return;

// 		this.filesData.forEach((file, index) => {
// 			const type = (file.type as any) || this.guessTypeFromUrl(file.remoteUrl || file.Url);

// 			// skip non-downloadable
// 			if (type === 'youtube' || type === 'pdf') return;

// 			// skip if already downloaded
// 			if (this.downloadService.findDownloaded(file.remoteUrl || file.Url)) return;

// 			this.downloadService.enqueueDownload(file.remoteUrl || file.Url, type, index, (percent) => {
// 				console.log(`Downloading ${file.remoteUrl}: ${percent}%`);
// 			}).then(item => {
// 				console.log('Downloaded:', item.fileName, item.localPath);
// 				// Recompute mapping (Url -> remote/local based on online status)
// 				this.filesData = this.prepareFiles(this.filesData);
// 			}).catch(err => {
// 				console.warn('Download failed for', file.remoteUrl, err);
// 			});
// 		});
// 	}


// 	private guessTypeFromUrl(url: string): DownloadedMedia['type'] {
// 		const u = (url || '').toLowerCase();
// 		if (!u) return 'other';
// 		if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
// 		if (u.endsWith('.pdf')) return 'pdf';
// 		if (u.match(/\.(mp4|mov|webm|mkv|avi)$/)) return 'video';
// 		if (u.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/)) return 'image';
// 		return 'other';
// 	}



// }



//bcsdfs
/* content-player.component.ts */
import {Component,Input,ViewChild,ElementRef,OnChanges,SimpleChanges,OnDestroy,AfterViewInit} from '@angular/core';
import { Subscription } from 'rxjs';
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
	@ViewChild('videoEl') videoElRef?: ElementRef<HTMLVideoElement>;

	currentIndex = 0;
	private autoplayTimer?: any;
	private destroyed = false;

	playerRecreateKey: string | null = null;

	constructor(private toastService: ToastService, private downloadService: WebosDownloadService) { }

	// ngOnInit() {

	// 	this.downloadImage("https://ds.iqtv.in/iqsignage/4/3181/IQ_WORLD_35184275.jpg", "IQ_WORLD_35184275.jpg")
	// }


	// downloadImage(imageUrl: string, filename: string) {
	// 	fetch(imageUrl)
	// 		.then(res => res.blob())
	// 		.then(blob => {
	// 			const url = window.URL.createObjectURL(blob);
	// 			const a = document.createElement('a');
	// 			a.href = url;
	// 			a.download = filename;
	// 			a.click();
	// 			window.URL.revokeObjectURL(url);
	// 		});
	// }

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['filesData'] && changes['filesData'].currentValue) {
			this.loadMediaFiles();
		}
	}

	ngAfterViewInit(): void {
		// nothing here but kept for future
	}

	ngOnDestroy(): void {
		clearTimeout(this.autoplayTimer);
		this.destroyed = true;
	}

	private loadMediaFiles() {
		this.filesData = this.prepareFiles(this.filesData);
		this.currentIndex = 0;

		// start background downloads (service will dedupe)
		const remoteList = (this.filesData || []).map(f => ({ Url: f.Url, type: f.type }));
		console.log("From content player component!!")
		this.downloadService.backgroundDownloadList(remoteList);

		this.resetPlayerForYouTube();
		setTimeout(() => this.showCurrentSlide(), 120);
	}

	/**
	 * Prepare files:
	 * - prefer localPath if downloaded (even when online)
	 * - when offline, only include items that have localPath (skip others)
	 */
	private prepareFiles(files: any[]): any[] {
		const downloadedMap = this.downloadService.getDownloadedMap();
		const isOffline = !navigator.onLine;

		return (files || []).map(file => {
			const remoteUrl = (file?.Url || '').toString();
			const norm = (remoteUrl || '').split('?')[0];
			const downloaded = downloadedMap[norm] ?? downloadedMap[remoteUrl];

			// if offline and no downloaded copy → skip this file
			if (isOffline && !downloaded) return null;

			// prefer localPath if exists, otherwise remoteUrl
			const playUrl = downloaded ? downloaded.url : remoteUrl;

			// guess type from remote original
			const lurl = (remoteUrl || '').toLowerCase();
			let type: any = 'other';
			if (lurl.includes('youtube.com') || lurl.includes('youtu.be')) type = 'youtube';
			else if (/\.(mp4|mov|avi|mkv|webm)$/i.test(lurl)) type = 'video';
			else if (/\.(jpg|jpeg|png|gif|bmp|svg|webp)$/i.test(lurl)) type = 'image';
			else if (lurl.endsWith('.pdf')) type = 'pdf';

			return { ...file, remoteUrl, Url: playUrl, type };
		}).filter(Boolean) as any[];
	}

	private showCurrentSlide() {
		clearTimeout(this.autoplayTimer);
		const currentFile = this.filesData[this.currentIndex];
		if (!currentFile) return;

		const isOffline = !navigator.onLine;
		const downloaded = this.downloadService.findDownloaded(currentFile.remoteUrl);
		const playUrl = isOffline	? (downloaded ? downloaded.url : null)	: (downloaded ? downloaded.url : currentFile.remoteUrl);

		if (!playUrl) {
			// nothing to play — skip to next
			this.nextSlideAndShow();
			return;
		}

		if (currentFile.type === 'video') {
			// update the <video> element's src directly
			setTimeout(() => {
				const videoEl = this.videoElRef?.nativeElement ?? document.getElementById('media-video') as HTMLVideoElement | null;
				if (videoEl) {
					// If the same src is set, re-load to avoid black screen on some engines
					if (videoEl.src !== playUrl) {
						videoEl.src = playUrl;
					} else {
						videoEl.load();
					}
					videoEl.currentTime = 0;
					videoEl.play().catch(err => console.warn('Autoplay blocked', err));
					videoEl.onended = () => this.nextSlideAndShow();
				} else {
					// fallback: try next
					this.autoplayTimer = setTimeout(() => this.nextSlideAndShow(), 5000);
				}
			});
		} else if (currentFile.type === 'image') {
			// show image for fixed duration
			this.autoplayTimer = setTimeout(() => this.nextSlideAndShow(), 10000);
		} else if (currentFile.type === 'youtube') {
			if (!isOffline) {
				this.resetPlayerForYouTubeForCurrentIndex();
				// YouTube component will emit videoEnded
			} else {
				// skip youtube when offline
				this.nextSlideAndShow();
			}
		} else if (currentFile.type === 'pdf') {
			// pdf viewer will call next via event binding
		} else {
			this.autoplayTimer = setTimeout(() => this.nextSlideAndShow(), 10000);
		}
	}

	private nextSlideAndShow() {
		clearTimeout(this.autoplayTimer);
		if (!this.filesData || !this.filesData.length) return;
		this.currentIndex = (this.currentIndex + 1) % this.filesData.length;
		this.resetPlayerForYouTubeForCurrentIndex();
		setTimeout(() => this.showCurrentSlide(), 80);
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
		setTimeout(() => this.playerRecreateKey = this.generateKey(), 60);
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
}
