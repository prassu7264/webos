

import { Component, Input, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';

import { ToastService } from '../_core/services/toast.service';
import { YtplayerComponent } from '../_core/cell-renders/ytplayer/ytplayer.component';

@Component({
  selector: 'app-content-player',
  templateUrl: './content-player.component.html',
  styleUrls: ['./content-player.component.scss']
})
export class ContentPlayerComponent implements OnChanges {
  device: any;
  @Input() filesData: any[] = [];

  private intervalSub?: Subscription;
  @ViewChild(YtplayerComponent) youtubePlayerComponent!: YtplayerComponent;
  currentIndex: number = 0;
  private autoplayTimer?: any;

  // key used to force recreate the YT component when needed
  playerRecreateKey: string | null = null;

  constructor(private toastService: ToastService) { }

  ngOnChanges(changes: SimpleChanges): void {
    // If the incoming filesData changed (order changed), reprepare and restart
    if (changes['filesData'] && changes['filesData'].currentValue) {
      this.loadMediaFiles();
    }
  }

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

    // When playlist changes we want to ensure any existing youtube iframe is destroyed and recreated
    this.resetPlayerForYouTube();

    // Give Angular and the browser a little time to tear down old iframes, then start
    setTimeout(() => {
      this.showCurrentSlide();
    }, 120);
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
    if (!currentFile) return;

    console.log("Showing file:", this.currentIndex, currentFile);

    if (currentFile.type === 'video') {
      // Get video element after Angular renders it
      setTimeout(() => {
        const videoEl = document.getElementById('media-video') as HTMLVideoElement;
        if (videoEl) {
          videoEl.pause();
          videoEl.currentTime = 0;

          videoEl.play().catch(err => console.warn("Autoplay blocked:", err));

          videoEl.onended = () => this.nextSlideAndShow();
        }
      });
    } else if (currentFile.type === 'image') {
      // Show image for 10 seconds
      this.autoplayTimer = setTimeout(() => this.nextSlideAndShow(), 10000);
    } else if (currentFile.type === 'youtube') {
      // For YouTube, force recreate key to ensure component gets a fresh iframe
      this.resetPlayerForYouTubeForCurrentIndex();
      // No timer here — YT player will notify via (videoEnded)
    } else if (currentFile.type === 'pdf') {
      // pdf viewer will emit pdfEnded to move next
    } else {
      this.autoplayTimer = setTimeout(() => this.nextSlideAndShow(), 10000);
    }
  }

  /**
   * Go to next slide and display it
   */
  private nextSlideAndShow() {
    clearTimeout(this.autoplayTimer); // safety
    if (!this.filesData.length) return;
    this.currentIndex = (this.currentIndex + 1) % this.filesData.length;

    // For youtube ensure the YT component is recreated for the new index
    this.resetPlayerForYouTubeForCurrentIndex();

    // small delay to allow destroy/create
    setTimeout(() => this.showCurrentSlide(), 80);
    console.log(this.currentIndex);
  }

  /**
   * Manual navigation (e.g., next button)
   */
  nextSlide() {
    clearTimeout(this.autoplayTimer);
    if (!this.filesData.length) return;
    this.currentIndex = (this.currentIndex + 1) % this.filesData.length;
    this.resetPlayerForYouTubeForCurrentIndex();
    setTimeout(() => this.showCurrentSlide(), 80);
  }

  onVideoEnded(event: { success: boolean; message?: string }) {
    if (!event.success && event.message) {
      this.toastService.error(event.message);
    }
    this.nextSlideAndShow();
  }

  /**
   * Force recreation of the YouTube player component by toggling playerRecreateKey
   * Used when playlist/order/index changes so the iframe is built fresh (avoids black-screen).
   */
  private resetPlayerForYouTube() {
    // change key to null so *ngIf will destroy the player, then set a new key
    this.playerRecreateKey = null;
    setTimeout(() => {
      this.playerRecreateKey = this.generateKey();
    }, 60);
  }

  private resetPlayerForYouTubeForCurrentIndex() {
    // Only toggle if current item is youtube
    if (this.filesData[this.currentIndex]?.type === 'youtube') {
      this.resetPlayerForYouTube();
    } else {
      // if it's not youtube, ensure playerRecreateKey is null so no stale player remains
      this.playerRecreateKey = null;
    }
  }

  private generateKey(): string {
    // Use video URL + index + timestamp as unique key
    const file = this.filesData[this.currentIndex];
    const url = file?.Url || '';
    return `${url}_${this.currentIndex}_${Date.now()}`;
  }
}
