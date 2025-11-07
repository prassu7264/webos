import { Component, OnInit } from '@angular/core';
import { FilesystemService } from '../../services/filesystem.service';
import { MatDialog } from '@angular/material/dialog';
import { ToastService } from '../../services/toast.service';
import { SplitScreenComponent } from 'src/app/split-screen/split-screen.component';
import { SplitScreenService } from '../../services/split-screen.service';

@Component({
  selector: 'app-menu1',
  templateUrl: './menu1.component.html',
  styleUrls: ['./menu1.component.scss']
})
export class Menu1Component implements OnInit {
  isCopyContent = false;
  isClearCopyContent = false;
  imageDelay: number = 10;
  constructor(private fsService: FilesystemService, private matDialog: MatDialog, private toastService: ToastService, private splitService: SplitScreenService) { }
  ngOnInit() {

    this.isCopyContent = localStorage.getItem('isCopyContent') === 'true';
    this.isClearCopyContent = localStorage.getItem('isClearCopyContent') === 'true';

    const savedDelay = localStorage.getItem('imageDelay');
    this.imageDelay = savedDelay ? parseInt(savedDelay, 10) : 10;

  }

  onChangePendriveSetting(value: boolean, type: 'CopyContent' | 'ClearCopyContent') {

    let isCopyContent = localStorage.getItem('isCopyContent') == "true";
    let isClearCopyContent = localStorage.getItem('isClearCopyContent') === "true";

    if (type === 'CopyContent') {
      this.isCopyContent = value;
      if (value && isClearCopyContent) this.isClearCopyContent = false;
    } else if (type === 'ClearCopyContent') {
      this.isClearCopyContent = value;
      if (value && isCopyContent) this.isCopyContent = false;
    }

    // Save both states
    localStorage.setItem('isCopyContent', String(this.isCopyContent));
    localStorage.setItem('isClearCopyContent', String(this.isClearCopyContent));
    // sessionStorage.setItem('ModeConfiguration', "false");
    if (this.isClearCopyContent || this.isCopyContent) {
      this.pendriveSettings();
    }
  }

  changeValue(step: number) {
    this.imageDelay = Math.max(0, this.imageDelay + step);
    localStorage.setItem('imageDelay', String(this.imageDelay));
  }

  async clearDownloads(): Promise<void> {
    this.fsService.deleteAllFiles('downloads/IQW')
      .then(() => {
        this.toastService.success("Storage Cleared");
        this.pendriveSettings();
      })
      .catch((err: any) => {
        const message = err?.message || 'Failed to clear storage';
        this.toastService.error(message);
        console.error('Error clearing downloads:', err);
      });
  }

  exitPendrive() {
    sessionStorage.setItem("ModeConfiguration", "false");
    this.matDialog.closeAll();
  }
  async pendriveSettings() {
    const fods = await this.fsService.countPendrivesWithIQFolder('IQ');
    const hasPendriveWithIQ = fods.pendrivesWithIQ.length > 0;
    const hasEnoughSpace = await this.fsService.hasEnoughStorage(300);
    if (hasPendriveWithIQ && hasEnoughSpace) {
      if (this.isClearCopyContent || this.isCopyContent) {
        this.splitService.triggerPendriveSettings();
      }
    } else {
      // ❌ Handle errors individually
      if (!hasPendriveWithIQ) {
        this.toastService.error('No pendrive with “IQ” folder detected.');
      } else {
        this.toastService.error('Insufficient storage space available.');
      }
    }
  }



}
