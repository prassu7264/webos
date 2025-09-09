import { Component, Input, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';

import { ToastService } from '../_core/services/toast.service';
import { YtplayerComponent } from '../_core/cell-renders/ytplayer/ytplayer.component';
@Component({
	selector: 'app-content-player',
	templateUrl: './content-player.component.html',
	styleUrls: ['./content-player.component.scss']
})
export class ContentPlayerComponent {
	device: any;
	@Input() filesData: any[] = [];

	private intervalSub?: Subscription;
	@ViewChild(YtplayerComponent) youtubePlayerComponent!: YtplayerComponent;
	currentIndex: number = 0;
	private autoplayTimer?: any;
	constructor(private toastService: ToastService) { }

	ngOnInit(): void {
		console.log(this.filesData);
		this.loadMediaFiles();
	}

	ngOnDestroy(): void {
		this.intervalSub?.unsubscribe();
		clearTimeout(this.autoplayTimer);
	}


	private loadMediaFiles() {
		this.filesData = this.prepareFiles(this.filesData);
		this.currentIndex = 0;
		this.showCurrentSlide();

	}

	private prepareFiles(files: any[]): any[] {
		const videoExt = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
		const imageExt = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
		const pdfExt = ['pdf'];

		return files
			.map(file => {
				const url = file?.Url?.toLowerCase() || '';
				let type = 'other';

				if (url.includes('youtube.com') || url.includes('youtu.be')) {
					type = 'youtube';
				} else if (videoExt.some(ext => url.endsWith('.' + ext))) {
					type = 'video';
				} else if (imageExt.some(ext => url.endsWith('.' + ext))) {
					type = 'image';
				}
				else if (pdfExt.some(ext => url.endsWith('.' + ext))) {
					type = 'pdf';
				}

				return { ...file, type };
			})
			.filter(file => file.type !== 'other');
	}

	private showCurrentSlide() {
		clearTimeout(this.autoplayTimer);
		const currentFile = this.filesData[this.currentIndex];
		if (!currentFile) return;

		console.log("Showing file:", this.currentIndex, currentFile);

		if (currentFile.type === 'video') {
			// Get video element after Angular renders it
			setTimeout(() => {
				const videoEl = document.getElementById('media-video') as HTMLVideoElement;
				if (videoEl) {
					videoEl.pause();
					videoEl.currentTime = 0;
					// videoEl.muted = true;

					// Try to play video
					videoEl.play().catch(err => console.warn("Autoplay blocked:", err));

					// ✅ Only one handler for end
					videoEl.onended = () => this.nextSlideAndShow();
				}
			});
		} else if (currentFile.type === 'image') {
			// Show image for 10 seconds
			this.autoplayTimer = setTimeout(() => this.nextSlideAndShow(), 10000);
		} else if (currentFile.type === 'youtube' || currentFile.type === 'pdf') {

		} else {
			// Show image for 10 seconds
			this.autoplayTimer = setTimeout(() => this.nextSlideAndShow(), 10000);
		}
	}


	/**
	 * Go to next slide and display it
	 */
	private nextSlideAndShow() {
		clearTimeout(this.autoplayTimer); // safety
		this.currentIndex = (this.currentIndex + 1) % this.filesData.length;
		this.showCurrentSlide();
		console.log(this.currentIndex);
	}

	/**
	 * Manual navigation (e.g., next button)
	 */
	nextSlide() {
		clearTimeout(this.autoplayTimer);
		this.currentIndex = (this.currentIndex + 1) % this.filesData.length;
		this.showCurrentSlide();
	}

	onVideoEnded(event: { success: boolean; message?: string }) {
		if (!event.success && event.message) {
			this.toastService.error(event.message);
		}
		this.nextSlideAndShow();
	}

}
