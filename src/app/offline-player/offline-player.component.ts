import { Component, OnInit } from '@angular/core';
import { OfflinePlayerService } from '../_core/services/offline-player.service';

@Component({
  selector: 'app-offline-player',
  templateUrl: './offline-player.component.html',
  styleUrls: ['./offline-player.component.scss']
})
export class OfflinePlayerComponent implements OnInit {
  downloaded: any[] = [];
  selectedIndex: number = 0;
  fullscreenMedia: any = null;

  constructor(private offlineService: OfflinePlayerService) { }

  async ngOnInit() {
    this.downloaded = await this.offlineService.getAllDownloads();
  }

  selectMedia(index: number) {
    this.selectedIndex = index;
    this.fullscreenMedia = this.downloaded[index];
  }

  goBack() {
    // Reset fullscreen view
    this.fullscreenMedia = null;
  }

  exitFullscreen() {
    // Same as goBack for now
    this.fullscreenMedia = null;
  }
}
