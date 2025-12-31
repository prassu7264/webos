import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { FilesystemService } from '../../services/filesystem.service';

declare const webapis: any;
declare const tizen: any;

@Component({
  selector: 'app-video-player',
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.scss'],
})
export class VideoPlayerComponent implements OnInit, OnDestroy, OnChanges {
  @Input() url!: string;
  @Input() index!: number;
  @Input() loop = false;
  @Output() videoEnded = new EventEmitter<{ success: boolean; message?: string }>();

  isAvplay = true;
  private avPlayer: any;
  private hasEmittedEnd = false;

  constructor(private fsService: FilesystemService) { }

  ngOnInit() {
    this.initializePlayer();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['url'] && !changes['url'].firstChange) {
      console.log('🔁 URL changed — restarting player...');
      this.stopAndClosePlayer();
      this.hasEmittedEnd = false;
      this.initializePlayer();
    }
  }

  ngOnDestroy() {
    this.stopAndClosePlayer();
  }

  /** Initialize Tizen AVPlay or fallback to HTML5 */
  private initializePlayer() {
    if (!this.url) {
      console.log('⚠️ No video URL provided');
      return;
    }

    if (typeof webapis === 'undefined' || !webapis.avplay) {
      console.error('❌ AVPlay API not available — fallback to HTML5');
      this.isAvplay = false;
      this.playOnhtml();
      return;
    }

    try {
      this.avPlayer = webapis.avplay;

      // Stop previous playback if running
      try {
        const state = this.avPlayer.getState?.();
        if (state && state !== 'NONE') {
          this.avPlayer.stop();
          this.avPlayer.close();
        }
      } catch { }

      console.log('🎥 Opening video URL:', this.url);
      this.avPlayer.open(this.url);
      this.setFullScreenRect();
      this.avPlayer.setDisplayMethod('PLAYER_DISPLAY_MODE_FULL_SCREEN');

      this.avPlayer.setListener({
        onstreamcompleted: () => {
          console.log('✅ Stream completed');
          if (this.loop) {
            this.ngOnInit();
          }
          else this.safeEmitEnd(true);
        },
        onerror: (err: any) => {
          console.error('❌ AVPlay error:', err);
          const msg = err?.message?.includes('PLAYER_ERROR_NOT_SUPPORTED_FILE')
            ? '⚠️ Unsupported video format.'
            : err?.message || 'Playback error occurred.';
          this.safeEmitEnd(false, msg);
        },
        onbufferingstart: () => console.log('⏳ Buffering...'),
        onbufferingprogress: (p: number) => console.log(`📶 Buffering ${p}%`),
        onbufferingcomplete: () => {
          console.log('✅ Buffering complete');
          this.setFullScreenRect();
        },
      });

      this.avPlayer.prepareAsync(
        () => {
          console.log('🎬 Prepared — starting playback...');
          this.setFullScreenRect();
          // Small delay for smoother start on slower TVs
          setTimeout(() => this.play(), 200);
        },
        (err: any) => {
          console.error('❌ Prepare failed:', err);
          const msg = err?.message?.includes('PLAYER_ERROR_NOT_SUPPORTED_FILE')
            ? '⚠️ Video not supported.'
            : err?.message || 'Playback error.';
          this.safeEmitEnd(false, msg);
        }
      );
    } catch (err) {
      console.error('💥 Exception initializing AVPlay:', err);
      this.safeEmitEnd(false, 'Unexpected playback error');
    }
  }

  /** Fullscreen rect for any resolution */
  private setFullScreenRect() {
    try {
      let width = window.innerWidth;
      let height = window.innerHeight;
      let x = 0;
      let y = 0;

      if (typeof tizen !== 'undefined' && tizen.systeminfo) {
        try {
          const is4K = screen.width >= 3840 || window.innerWidth >= 3840;
          width = is4K ? 3840 : 1920;
          height = is4K ? 2160 : 1080;
          console.log(`📺 Using ${is4K ? '4K' : 'Full HD'} mode`);
        } catch (e) {
          console.log('⚠️ Screen info not accessible:', e);
        }
      }

      this.avPlayer?.setDisplayRect(x, y, width, height);
      console.log(`🖥️ Display rect: ${width}x${height}`);
    } catch (e) {
      console.error('💥 setDisplayRect failed:', e);
      this.avPlayer?.setDisplayRect(0, 0, 1920, 1080);
    }
  }

  private play() {
    try {
      if (this.avPlayer?.getState?.() === 'READY' || this.avPlayer?.getState?.() === 'PAUSED') {
        this.avPlayer.play();
        console.log('▶️ Playing video...');
      }
    } catch (err) {
      console.error('💥 Play error:', err);
      this.safeEmitEnd(false, 'Playback start failed');
    }
  }

  private stopAndClosePlayer() {
    try {
      if (this.avPlayer?.getState && this.avPlayer.getState() !== 'NONE') {
        this.avPlayer.stop();
        this.avPlayer.close();
        console.log('🧹 Player stopped and closed');
      }
    } catch (err) {
      console.log('⚠️ Stop error:', err);
    } finally {
      this.avPlayer = null;
    }
  }

  private safeEmitEnd(success: boolean, message?: string) {
    if (this.hasEmittedEnd) return;
    this.hasEmittedEnd = true;
    this.videoEnded.emit({ success, message });
  }

  /** Fallback for Web or Non-Tizen TVs */
  private playOnhtml() {
    setTimeout(() => {
      const videoEl = document.getElementById('media-video') as HTMLVideoElement;
      if (!videoEl) {
        console.log('⚠️ Video element not found');
        return;
      }

      videoEl.src = this.url;
      videoEl.currentTime = 0;
      videoEl.load();

      videoEl.onended = () => {
        this.safeEmitEnd(true);
        videoEl.onended = null;
      };

      const tryPlay = async (attempt = 1) => {
        try {
          await videoEl.play();
          console.log(`✅ Video started (attempt ${attempt})`);
        } catch (err) {
          console.log(`⚠️ Autoplay attempt ${attempt} failed`, err);
          if (!videoEl.muted) {
            videoEl.muted = true;
          }
          if (attempt < 3) {
            setTimeout(() => tryPlay(attempt + 1), 500);
          } else {
            console.error('🚫 Video cannot play after multiple attempts');
            this.safeEmitEnd(false, 'Autoplay failed');
          }
        }
      };

      videoEl.addEventListener('canplaythrough', () => tryPlay(), { once: true });

      videoEl.onerror = () => {
        const err = videoEl.error;
        let msg = 'Unknown video error';
        if (err) {
          switch (err.code) {
            case err.MEDIA_ERR_ABORTED:
              msg = 'Playback aborted.';
              break;
            case err.MEDIA_ERR_NETWORK:
              msg = 'Network error.';
              break;
            case err.MEDIA_ERR_DECODE:
              msg = 'Decoding error.';
              break;
            case err.MEDIA_ERR_SRC_NOT_SUPPORTED:
              msg = 'Format not supported.';
              if (this.url.startsWith('file://')) {
                this.fsService.deleteFile(this.url)
                  .then(() => console.log('🗑️ Deleted corrupted file'))
                  .catch(e => console.error('Failed to delete file:', e));
              }
              break;
          }
        }
        console.error('Video load failed:', msg);
        this.safeEmitEnd(false, msg);
      };
    });
  }
}
