import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-ytubeplayer',
  templateUrl: './ytubeplayer.component.html',
  styleUrls: ['./ytubeplayer.component.scss']
})
export class YtubeplayerComponent {
  origin = window.location.origin;
  @Input() url!: string;
  @Input() index!: number;
  @Output() videoEnded = new EventEmitter<{ success: boolean; message?: string }>();

  videoId: string | null = null;

  ngOnInit() {
    this.videoId = this.getYouTubeVideoID(this.url);
  }

  onStateChange(event: YT.OnStateChangeEvent) {
    if (event.data === window['YT'].PlayerState.ENDED) {
      this.videoEnded.emit({ success: true });
    }
  }

  onError(event: YT.OnErrorEvent) {
    let message = '';
    switch (event.data) {
      case 2:
        message = 'Invalid parameter (bad videoId)';
        break;
      case 5:
        message = 'HTML5 player error';
        break;
      case 100:
        message = 'Video not found (removed/private)';
        break;
      case 101:
      case 150:
        message = 'Embedding not allowed by video owner';
        break;
      default:
        message = `Unknown error: ${event.data}`;
    }
    console.log(message);
    this.videoEnded.emit({ success: false, message });
  }

  private getYouTubeVideoID(url: string): string | null {
    const regex = [
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

    for (const reg of regex) {
      const match = url.match(reg);
      if (match && match[1]) return match[1];
    }
    return null;
  }
}