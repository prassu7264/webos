import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-youtube-player',
  templateUrl: './youtube-player.component.html',
  styleUrls: ['./youtube-player.component.scss']
})
export class YoutubePlayerComponent implements OnInit, OnDestroy, OnChanges {
  @Input() url!: string;
  @Input() index!: number;
  @Input() loop: boolean = false;
  @Output() videoEnded = new EventEmitter<{ success: boolean; index: number }>();
  isOpenSwalAlert: any
  ytUrl: SafeResourceUrl | null = null;
  status = '🎥 Waiting for video events...';
  private messageHandler = (event: MessageEvent) => this.handleMessage(event);

  constructor(private sanitizer: DomSanitizer, private toastService: ToastService) { }

  ngOnInit(): void {
    this.updateUrl();
    window.addEventListener('message', this.messageHandler);
    // this.isOpenSwalAlert = true;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['url'] && !changes['url'].firstChange) {
      this.updateUrl();
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.messageHandler);
  }

  private updateUrl(): void {
    if (!this.url) return;
    const videoId = this.getYouTubeVideoID(this.url);
    let loop = this.loop ? 1 : 0;
    // const safeUrl = `https://aar.ridsys.in/yt.html?v=${videoId}&loop=${loop}`;
    const safeUrl = `https://ds.iqtv.in/youtube/yt.html?v=${videoId}&loop=${loop}`;
    this.ytUrl = this.sanitizer.bypassSecurityTrustResourceUrl(safeUrl);
  }

  private handleMessage(event: MessageEvent) {
    if (!event.data || typeof event.data !== 'object') return;

    if (event.data.type === 'YT_VIDEO_STARTED') {
      console.log('▶️ YouTube video started:', event.data.videoId);
      this.status = '▶️ Playing';
    }

    if (event.data.type === 'YT_VIDEO_ENDED') {
      console.log('🏁 YouTube video ended:', event.data.videoId);
      this.status = '🏁 Ended';
      this.videoEnded.emit({ success: true, index: this.index });
    }
    // if (event.data.type === 'YT_VIDEO_OFFLINE') {
    //   this.isOpenSwalAlert = true;
    // }
    // if (event.data.type === 'YT_VIDEO_ONLINE') {
    //   this.isOpenSwalAlert = false;
    //   this.toastService.info("Back online! Reconnecting...")

    // }
  }

  private getYouTubeVideoID(url: any): string | null {
    if (!url) return null;
    const regexList = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:m\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:m\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:m\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/
    ];

    for (const reg of regexList) {
      const match = (url || '').toString().match(reg);
      if (match && match[1]) return match[1];
    }
    return null;
  }
}
