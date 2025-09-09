import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-ytplayer',
  templateUrl: './ytplayer.component.html',
  styleUrls: ['./ytplayer.component.scss']
})
export class YtplayerComponent
  implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Input() url!: string;
  @Input() index!: number;
  @Output() videoEnded = new EventEmitter<{ success: boolean; message?: string }>();
  @Output() videoReady = new EventEmitter<{ duration: number }>();
  @Output() durationFound = new EventEmitter<number>();
  @Input() loop: boolean = false;


  player: YT.Player | null = null;

  ngOnInit(): void {
    this.loadYouTubeAPI();
  }

  onPlayerReady(event: any) {
    const duration = event.target.getDuration();
    this.durationFound.emit(duration); //  send duration back to ContentPlayer
  }
  onPlayerStateChange(event: any) {
    if (event.data === window['YT'].PlayerState.ENDED) {
      this.videoEnded.emit();
    }
  }

  ngAfterViewInit(): void {
    this.initPlayer();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['url'] && !changes['url'].firstChange) ||
      (changes['index'] && !changes['index'].firstChange)) {
      setTimeout(() => {
        this.initPlayer();
      }, 0);
    }
  }

  ngOnDestroy(): void {
    this.destroyPlayer();
  }

  private loadYouTubeAPI(): void {
    if (!window['YT']) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);

      (window as any).onYouTubeIframeAPIReady = () => {
        this.initPlayer();
      };
    }
  }

  private initPlayer(): void {
    this.destroyPlayer();

    const videoId = this.getYouTubeVideoID(this.url);
    if (!videoId) return;

    const container = document.getElementById(`ytplayer-${this.index}`);
    if (!container) return;

    this.player = new window['YT'].Player(container, {
      videoId,
      playerVars: { autoplay: 1, controls: 0, modestbranding: 1, rel: 0, origin: window.location.origin, showinfo: 0, iv_load_policy: 3, fs: 0, cc_load_policy: 0, },
      events: {
        onReady: (event: YT.PlayerEvent) => {
          const duration = event.target.getDuration();
          console.log("Video duration:", duration, "seconds");
          this.videoReady.emit({ duration });
          event.target.mute();
          event.target.setPlaybackQuality('highres');
          setTimeout(() => {
            event.target.playVideo()
            // event.target.unMute();
          }, 200);
          setTimeout(() => {
            event.target.unMute();
          }, 300);
        },
        // onStateChange: (event: YT.OnStateChangeEvent) => {
        //   if (event.data === window['YT'].PlayerState.ENDED) {
        //     this.videoEnded.emit({ success: true });
        //   }
        // },
        onStateChange: (event: YT.OnStateChangeEvent) => {
          if (event.data === window['YT'].PlayerState.ENDED) {
            if (this.loop && this.player) {
              // replay same video
              this.player.seekTo(0, true);   //  must pass allowSeekAhead
              this.player.playVideo();
            } else {
              // normal flow: notify parent to go next
              this.videoEnded.emit({ success: true });
            }
          }
        },
        onError: (event: YT.OnErrorEvent) => {
          this.onPlayerError(event)
        }
      }
    });
  }
  onPlayerError(event: any) {
    let message = '';
    switch (event.data) {
      case 2:
        message = "Invalid parameter (bad videoId)";
        break;
      case 5:
        message = "HTML5 player error";
        break;
      case 100:
        message = "Video not found (removed/private)";
        break;
      case 101:
      case 150:
        message = "Embedding not allowed by video owner";
        break;
      default:
        message = `Unknown error: ${event.data}`;
    }
    console.log(message);
    this.videoEnded.emit({ success: false, message });
  }
  private destroyPlayer(): void {
    if (this.player && this.player.destroy) {
      this.player.destroy();
      this.player = null;
    }
  }

  getYouTubeVideoID(url: any) {
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
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }
}

