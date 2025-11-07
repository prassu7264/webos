import { Component, Input, ViewChild, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { Subscription, tap } from 'rxjs';

import { ToastService } from '../_core/services/toast.service';
import { YtplayerComponent } from '../_core/cell-renders/ytplayer/ytplayer.component';
import { FilesystemService } from '../_core/services/filesystem.service';
import { ConnectionService, ConnectionState } from 'ng-connection-service';

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
  currentIndex: number = 0;
  private autoplayTimer?: any;
  @Input() zoneId!: number;
  @Output() zoneComplete = new EventEmitter<number>();
  playerRecreateKey: string | null = null;
  isOnline = true;
  private activePlayingId?: number;
  constructor(private toastService: ToastService, private fsService: FilesystemService, private connectionService: ConnectionService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filesData'] && changes['filesData'].currentValue) {
      console.log("filesData :", this.filesData);
      this.loadMediaFiles();

    }
  }

  ngOnInit(): void {
    // console.log(this.filesData);
    this.loadMediaFiles();
    this.subscription.add(
      this.connectionService.monitor().pipe(
        tap((newState: ConnectionState) => {
          if (newState.hasNetworkConnection) {
            this.filesData = this.filesData.map(ffile => ({
              ...ffile,
              downloadedUrl: ffile.Url
            }));
            this.showCurrentSlide();
          }
        })
      ).subscribe()
    );
    this.connectionService.monitor().pipe(
      tap((newState: ConnectionState) => {
        this.isOnline = newState.hasNetworkConnection;
      })
    ).subscribe()
  }

  ngOnDestroy(): void {
    this.intervalSub?.unsubscribe();
    clearTimeout(this.autoplayTimer);
  }

  private loadMediaFiles() {
    this.filesData = this.prepareFiles(this.filesData);
    this.currentIndex = 0;
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
    if (!currentFile) return;

    if (!Number(currentFile.Mediafile_id)) {
      currentFile.Mediafile_id = Date.now();
    }
    console.log("Showing file:", this.currentIndex, currentFile);
    // console.log(this.filesData);

    this.activePlayingId = currentFile.Mediafile_id;
    if (currentFile.type === 'video') {
      setTimeout(() => {
        const videoEl = document.getElementById('media-video') as HTMLVideoElement;
        if (!videoEl) {
          console.warn('Video element not found');
          return;
        }
        videoEl.pause();
        videoEl.removeAttribute('src');
        videoEl.src = currentFile.downloadedUrl || currentFile.Url;
        videoEl.currentTime = 0;
        videoEl.load();
        videoEl.onended = () => {
          // console.log('🎬 Video ended, moving to next slide');
          this.nextSlideAndShow();
          videoEl.onended = null;
        };


        let attempts = 0;
        const maxAttempts = 3;
        videoEl.play();
        const tryPlay = async () => {
          attempts++;
          try {
            await videoEl.play();
            console.log('✅ Video started (attempt ' + attempts + ')');
          } catch (err) {
            console.warn(`⚠️ Autoplay attempt ${attempts} failed`, err);


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

          console.error('Video failed to load', {
            src: videoEl.currentSrc || currentFile.Url,
            error: errorMsg,
          });

          this.toastService.error(errorMsg);


        };
      });
    }
    else if (currentFile.type === 'image') {
      this.autoplayTimer = setTimeout(() => this.nextSlideAndShow(), 10000);
    } else if (currentFile.type === 'youtube') {
      if (!this.isOnline) {
        this.nextSlideAndShow();
      }
      this.resetPlayerForYouTubeForCurrentIndex();
    } else if (currentFile.type === 'pdf') {
    } else {
      this.autoplayTimer = setTimeout(() => this.nextSlideAndShow(), 10000);
    }
    // if (currentFile?.type !== 'youtube' && this.fsService.detectPlatform() === 'tizen' && (!currentFile?.downloadedUrl || !currentFile.downloadedUrl.trim().startsWith('file:///'))) {
    //   this.downloadAndSaveFile(currentFile);
    // }
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
      // console.log("Next Slide Index:", this.currentIndex);
      console.log(this.currentIndex);

      setTimeout(() => this.showCurrentSlide(), 80);
    }

  }


  nextSlide() {
    clearTimeout(this.autoplayTimer);
    if (!this.filesData.length) return;
    this.currentIndex = (this.currentIndex + 1) % this.filesData.length;
    this.resetPlayerForYouTubeForCurrentIndex();
    setTimeout(() => this.showCurrentSlide(), 80);
  }

  onVideoEnded(event: { success: boolean; message?: string }, type: any) {
    if (!event.success && event.message) {
      this.toastService.error(event.message);
    }
    console.log(event);

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
        console.log("⏸️ Skipping downloadedUrl update for currently playing media");
        setTimeout(() => this.downloadAndSaveFile(media), 10000);
        return;
      }
      const result = await this.fsService.downloadFile(media.Url, 'downloads', media.Filename);
      if (result && !result.startsWith("https://")) {
        media.downloadedUrl = result.startsWith("file://") ? result
          : "file://" + result;
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