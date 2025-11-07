import { Component, OnInit, OnDestroy, ViewChild, TemplateRef, Injectable, ChangeDetectorRef, NgZone } from '@angular/core';
import { GridsterConfig, GridsterItem } from 'angular-gridster2';
import { AuthService } from '../_core/services/auth.service';
import { DeviceInfoService } from '../_core/services/device-info.service';
import { interval, Subscription, tap } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';
import { ConnectionService, ConnectionState } from 'ng-connection-service';
import { FilesystemService } from '../_core/services/filesystem.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ToastService } from '../_core/services/toast.service';
import { SplitScreenService } from '../_core/services/split-screen.service';
@Injectable({
  providedIn: 'root',
})
@Component({
  selector: 'app-split-screen',
  templateUrl: './split-screen.component.html',
  styleUrls: ['./split-screen.component.scss']
})
export class SplitScreenComponent implements OnInit, OnDestroy {
  status: string = 'ONLINE';
  currentState!: ConnectionState;
  subscription = new Subscription();
  updatedTime: any = '';
  options: GridsterConfig;
  splitScreen: any[] = [];
  splitScreenList: any[] = [];
  zoneinfo: GridsterItem[] | any[] = [];
  device: any;
  private intervalId: any;
  intervalSub?: Subscription;
  isPendriveModePlaying = false;
  isPendriveMode = false;
  isCheckingPendrive = false;
  splitCurrentIndex = 0;
  autoplayTimer?: any;
  redirecting = false;
  scrollers: any[] = [];
  topScrollers: any[] = [];
  bottomScrollers: any[] = [];
  dialogRef: any;
  zoneCompletionMap: { [zoneId: number]: boolean } = {};
  isClearCopyContent: any = false;
  isCopyContent: any = false;
  @ViewChild('pendriveErrorDialog') pendriveErrorDialog!: TemplateRef<any>;
  @ViewChild('exitconfirm', { static: true }) exitconfirm!: TemplateRef<any>;
  pendriveDialogRef?: MatDialogRef<any>;
  isPendriveNotDetected = true;
  private pendriveCheckCount = 0;
  private hasShownCopiedContentToast = false;
  private pendriveCheckInterval?: any;
  constructor(
    private authService: AuthService,
    private deviceInfoService: DeviceInfoService,
    private router: Router,
    private connectionService: ConnectionService,
    private fsService: FilesystemService,
    private dialog: MatDialog,
    private toastService: ToastService,
    private splitService: SplitScreenService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.options = {
      draggable: { enabled: false },
      resizable: { enabled: false },
      pushItems: true,
      swap: false,
      gridType: 'fit',
      margin: 0,
      outerMargin: false,
    };

    this.device = JSON.parse(sessionStorage.getItem('device') || '{}');
    if (this.device?.username && this.device?.password) this.signin();

    this.isPendriveMode = sessionStorage.getItem('ModeConfiguration') === 'true';
  }

  // ✅ Initialize component
  ngOnInit(): void {
    this.isPendriveMode = sessionStorage.getItem('ModeConfiguration') === 'true';
    this.isClearCopyContent = localStorage.getItem("isClearCopyContent") === 'true';
    this.isCopyContent = localStorage.getItem("isCopyContent") === 'true';
    this.checkPendrives();
    if (this.router.url === '/player') {
      history.pushState(null, '', window.location.href);
      window.addEventListener('popstate', () => {
        history.pushState(null, '', window.location.href);
        this.exitApp();
      });
    }

    this.device.isVertical = this.device?.orientation?.includes('9:16');

    this.deviceInfoService.deviceUID$.subscribe(uid => {
      if (uid) {
        this.device.androidid = uid;
        this.loadMediaFiles();
      }
    });
    setInterval(() => {
      this.isPendriveMode = sessionStorage.getItem('ModeConfiguration') === 'true';
    }, 765)
    this.intervalSub = interval(10000).subscribe(() => {
      if (this.device.androidid && !this.isPendriveMode) {
        this.isExistedDevice(this.device.androidid);
        this.checkForUpdates();
      }
    });

    this.subscription.add(
      this.connectionService.monitor().pipe(
        tap((newState: ConnectionState) => {
          this.currentState = newState;
          this.status = newState.hasNetworkConnection ? 'ONLINE' : 'OFFLINE';
        })
      ).subscribe()
    );

    this.intervalId = setInterval(() => this.checkPendrives(), 3000);

    this.splitService.pendriveTrigger$.subscribe(async () => {
      console.log('📥 Pendrive trigger received in SplitScreenComponent');
      const fods = await this.fsService.countPendrivesWithIQFolder('IQ');
      const hasPendriveWithIQ = fods.pendrivesWithIQ.length > 0;
      if (hasPendriveWithIQ) {
        const pendrivePath = fods.pendrivesWithIQ[0];
        const fullpath = await this.fsService.getStorageFullPath(pendrivePath);
        await this.pendriveSettings(fullpath);
      }
    });
  }

  async checkPendrives(): Promise<void> {
    try {
      this.isPendriveMode = sessionStorage.getItem('ModeConfiguration') === 'true';

      if (!this.isPendriveMode) {
        // Pendrive mode is OFF
        this.stopPendriveMode();
        this.handlePendriveNotDetected("Pendrive mode off or pendrive removed");
        return;
      }

      // Check for pendrive with "IQ" folder
      const fods = await this.fsService.countPendrivesWithIQFolder('IQ');
      const hasPendriveWithIQ = fods.pendrivesWithIQ.length > 0;
      const destination = '/opt/usr/home/owner/content/Downloads/IQW';
      const files: any = await this.fsService.listAllFilesOnStorage(destination);
      if (hasPendriveWithIQ) {
        // this.pendriveDialogRef?.close();
        // ✅ Real pendrive found
        this.hasShownCopiedContentToast = false;
        this.isPendriveNotDetected = false;
        this.pendriveCheckCount = 0;

        const pendrivePath = fods.pendrivesWithIQ[0];
        const fullpath = await this.fsService.getStorageFullPath(pendrivePath);
        if (!this.isPendriveModePlaying) {
          this.startPendriveMode(pendrivePath);
          await this.pendriveSettings(fullpath);
        }


        if (this.pendriveCheckInterval) {
          clearInterval(this.pendriveCheckInterval);
        }

        // start checking every 3 seconds
        this.pendriveCheckInterval = setInterval(async () => {
          const fods = await this.fsService.countPendrivesWithIQFolder('IQ');
          const hasPendriveWithIQ = fods.pendrivesWithIQ.length > 0;

          if (!hasPendriveWithIQ) {
            clearInterval(this.pendriveCheckInterval);
            this.pendriveCheckInterval = undefined;
            await this.checkPendrives();
          }
        }, 3000);
        return;
      }

      if (!hasPendriveWithIQ && files.length > 0) {
        // ✅ Show toast only once
        if (!this.hasShownCopiedContentToast) {
          this.toastService.info("Playing from copied content");
          this.isPendriveModePlaying = false;
          this.hasShownCopiedContentToast = true;
        }
        this.isPendriveNotDetected = false;
        // ✅ Initialize playback
        if (!this.isPendriveModePlaying) {
          this.isPendriveModePlaying = true;
          this.zoneinfo = [
            {
              cols: 1,
              height: 0,
              id: 0,
              ismute: 'true',
              media_list: files,
              rows: 1,
              width: 0,
              x: 0,
              y: 0,
            }
          ];
        }

        // ✅ Prevent duplicate interval
        if (this.pendriveCheckInterval) return;

        // ✅ Start single stable interval to detect reinsert
        this.pendriveCheckInterval = setInterval(async () => {
          try {
            const fods = await this.fsService.countPendrivesWithIQFolder('IQ');
            const hasPendriveWithIQ = fods.pendrivesWithIQ.length > 0;
            if (hasPendriveWithIQ) {
              this.toastService.info("Pendrive detected!!")
              clearInterval(this.pendriveCheckInterval);
              await new Promise(resolve => setTimeout(resolve, 5000));
              this.pendriveCheckInterval = undefined;
              this.hasShownCopiedContentToast = false;

              const pendrivePath = fods.pendrivesWithIQ[0];
              const fullpath = await this.fsService.getStorageFullPath(pendrivePath);
              await this.pendriveSettings(fullpath);
            }
          } catch (err) {
            console.error('Error in pendrive check interval:', err);
          }
        }, 5000);

        return;
      }

      // ❌ Neither pendrive nor copied content found
      this.handlePendriveNotDetected("Pendrive not detected & no copied content detected");
      // sessionStorage.setItem("ModeConfiguration", "false");
      this.showPendriveDialog("Pendrive not detected & no copied content detected");
      // this.dialog.closeAll();

      // this.zoneinfo = [];

    } catch (err: any) {
      console.error('Error checking pendrives:', err.message);
      // this.showPendriveDialog("Pendrive not detected & no copied content detected");
    } finally {
      this.isCheckingPendrive = false;
    }
  }


  private showPendriveDialog(message: string): void {
    // prevent multiple dialogs
    if (this.pendriveDialogRef || this.pendriveCheckInterval) return;

    // open dialog
    this.pendriveDialogRef = this.dialog.open(this.pendriveErrorDialog, {
      minWidth: '500px',
      disableClose: true,
      data: { title: 'Pendrive Error', message }
    });

    // clear any previous interval before creating a new one
    if (this.pendriveCheckInterval) {
      clearInterval(this.pendriveCheckInterval);
    }

    // start checking every 3 seconds
    this.pendriveCheckInterval = setInterval(async () => {
      const fods = await this.fsService.countPendrivesWithIQFolder('IQ');
      const hasPendriveWithIQ = fods.pendrivesWithIQ.length > 0;
      if (hasPendriveWithIQ) {
        this.toastService.info("Pendrive detected!!");
        const pendrivePath = fods.pendrivesWithIQ[0];
        const fullpath = await this.fsService.getStorageFullPath(pendrivePath);
        // close dialog and stop checking
        await this.pendriveSettings(fullpath);
        this.pendriveDialogRef?.close();
        this.pendriveDialogRef = undefined;
        clearInterval(this.pendriveCheckInterval);
        this.pendriveCheckInterval = undefined;

        await this.checkPendrives();
      }
    }, 3000);

    // when dialog is closed manually
    this.pendriveDialogRef.afterClosed().subscribe(() => {
      this.pendriveDialogRef = undefined;

      // also stop checking when closed
      if (this.pendriveCheckInterval) {
        clearInterval(this.pendriveCheckInterval);
        this.pendriveCheckInterval = undefined;
      }
    });
  }
  // 🔹 Helper: consistent handling when pendrive missing
  private handlePendriveNotDetected(message: string): void {
    this.pendriveCheckCount++;
    if (this.pendriveCheckCount > 1 && !this.isPendriveNotDetected) {
      this.toastService.info(message);
      console.log(message);
      this.isPendriveNotDetected = true;
    }
  }
  exitPendrive() {
    sessionStorage.setItem("ModeConfiguration", "false");
    this.dialog.closeAll();
  }

  // ✅ Start Pendrive Mode
  private async startPendriveMode(pendrivePath: string): Promise<void> {
    this.isPendriveModePlaying = true;
    console.log('✅ Pendrive detected — loading IQ folder...');
    try {
      const files = await this.fsService.listAllFilesOnStorage(pendrivePath, 'IQ');
      console.log('Files in IQ folder:', files);

      this.zoneinfo = [
        {
          cols: 1,
          height: 0,
          id: 0,
          ismute: 'true',
          media_list: files,
          rows: 1,
          width: 0,
          x: 0,
          y: 0,
        }
      ];

      this.dialog.closeAll();
      this.zoneCompletionMap = {};
    } catch (error) {
      console.error('Failed to get files:', error);
    }
  }

  // ✅ Stop Pendrive Mode
  private stopPendriveMode(): void {
    if (this.isPendriveModePlaying) {
      console.log('🛑 Pendrive removed or mode off — stopping IQ playback...');
      this.isPendriveModePlaying = false;
      localStorage.removeItem('splitScreenList');
      this.zoneinfo = [];
      this.splitCurrentIndex = 0;
      this.showCurrentSlide();
    }
  }

  // ✅ Auth & Device
  private signin() {
    const payload = { username: this.device.username, password: this.device.password };
    this.authService.signin(payload).subscribe({
      next: (res: any) => this.authService.saveToken(res?.accessToken),
      error: (err) => console.error('Signin failed:', err),
    });
  }

  private isExistedDevice(deviceUID: string) {
    this.authService.isExistedDevice(deviceUID).subscribe((res: any) => {
      if (res?.status !== 'success' || !res.client_status || !res.device_status || res.isexpired) {
        if (!this.redirecting) {
          this.redirecting = true;
          sessionStorage.removeItem("device");
          this.router.navigate(['/login']);
        }
      } else if (this.device.orientation !== res.orientation) {
        const uid = this.device.androidid;
        this.device = res;
        this.device.androidid = uid;
        this.device.isVertical = this.device?.orientation?.includes('9:16');
        sessionStorage.setItem('device', JSON.stringify(res));
      }
    });
  }

  // ✅ Media Loading & Updating
  private loadMediaFiles() {
    this.authService.getMediafiles(this.device).subscribe((res: any) => {
      const newLayout = this.deepCopy(res?.layout_list ?? []);
      this.updatedTime = res.updated_time;
      this.splitScreen = this.deepCopy(newLayout);
      this.splitScreenList = this.deepCopy(newLayout);
      this.scrollers = res?.scrollerList || [];
      this.topScrollers = this.scrollers.filter(s => s.type === 'TOP');
      this.bottomScrollers = this.scrollers.filter(s => s.type === 'BOTTOM');
      this.splitCurrentIndex = 0;
      this.showCurrentSlide();
    });
  }

  private checkForUpdates() {
    this.authService.getMediafiles(this.device).subscribe((res: any) => {
      const newLayout = res?.layout_list ?? [];
      const newScrollers = res?.scrollerList || [];
      if (JSON.stringify(this.scrollers) !== JSON.stringify(newScrollers)) {
        this.scrollers = newScrollers;
        this.topScrollers = this.scrollers.filter(s => s.type === 'TOP');
        this.bottomScrollers = this.scrollers.filter(s => s.type === 'BOTTOM');
      }

      const oldSet = this.toMediaSet(this.splitScreen);
      const newSet = this.toMediaSet(newLayout);

      if (oldSet.size !== newSet.size || [...oldSet].some(x => !newSet.has(x)) || this.updatedTime !== res.updated_time) {
        this.splitScreen = this.deepCopy(newLayout);
        this.splitScreenList = this.deepCopy(newLayout);
        this.updatedTime = res.updated_time;
        this.splitCurrentIndex = 0;
        localStorage.removeItem('splitScreenList');
        this.showCurrentSlide();
      }
    });
  }

  // ✅ Slide Playback Logic
  private showCurrentSlide() {
    clearTimeout(this.autoplayTimer);
    this.zoneinfo = [];

    const stored = localStorage.getItem('splitScreenList');
    this.splitScreenList = stored ? JSON.parse(stored) : this.splitScreenList;

    if (!this.splitScreenList?.length) return;

    this.zoneinfo = this.splitScreenList[this.splitCurrentIndex]?.zonelist || [];
    console.log(this.zoneinfo);

    const layout_time = this.splitScreenList[this.splitCurrentIndex]?.layout_duration ?? 10;
    // Autoplay next slide (uncomment if needed)
    // this.autoplayTimer = setTimeout(() => this.nextSlideAndShow(), layout_time * 1000);
  }

  private nextSlideAndShow() {
    clearTimeout(this.autoplayTimer);
    if (!this.splitScreenList?.length) return;
    this.splitCurrentIndex = (this.splitCurrentIndex + 1) % this.splitScreenList.length;
    this.showCurrentSlide();
  }

  // ✅ Utilities
  private toMediaSet(data: any) {
    return new Set(
      data.flatMap((layout: any) =>
        layout.zonelist.flatMap((zone: any) =>
          zone.media_list.map((m: any) => `${m.Mediafile_id}|${m.Url}`)
        )
      )
    );
  }

  private deepCopy(obj: any) {
    return JSON.parse(JSON.stringify(obj));
  }

  trackById(index: number, item: any): any {
    return item.id ?? index;
  }

  onZoneComplete(zoneId: any) {
    this.zoneCompletionMap[zoneId] = true;
    const allCompleted = this.zoneinfo.every(zone => this.zoneCompletionMap[zone.id]);
    console.log(this.zoneCompletionMap);
    if (allCompleted && this.splitScreenList.length > 1 && !this.isPendriveMode) {
      this.nextSlideAndShow();
      this.zoneCompletionMap = {}
    }
  }

  // ✅ Exit Confirmation
  exitApp() {
    try {
      if (typeof window !== 'undefined' && (window as any).webOS?.platformBack) {
        (window as any).webOS.platformBack();
        return;
      }

      if (this.dialogRef) return;

      this.dialogRef = this.dialog.open(this.exitconfirm, { minWidth: '450px' });

      this.dialogRef.afterClosed().subscribe((result: any) => {
        if (result) window.close();
        this.dialogRef = null;
      });
    } catch (err) {
      console.error('❌ exitApp error:', err);
    }
  }
  // ✅ Cleanup
  ngOnDestroy(): void {
    this.intervalSub?.unsubscribe();
    clearTimeout(this.autoplayTimer);
    this.subscription.unsubscribe();
    if (this.intervalId) clearInterval(this.intervalId);
  }
  async pendriveSettings(source: any) {
    this.isPendriveMode = sessionStorage.getItem('ModeConfiguration') === 'true';
    this.isClearCopyContent = localStorage.getItem('isClearCopyContent') === 'true';
    this.isCopyContent = localStorage.getItem('isCopyContent') === 'true';

    const fods = await this.fsService.countPendrivesWithIQFolder('IQ');
    const hasPendriveWithIQ = fods.pendrivesWithIQ.length > 0;
    const destination = '/opt/usr/home/owner/content/Downloads/IQW';
    const hasEnoughSpace = await this.fsService.hasEnoughStorage(300);

    if (hasPendriveWithIQ && hasEnoughSpace) {
      if ((this.isClearCopyContent || this.isCopyContent) && this.isPendriveMode) {

        // ✅ Step 1: Clear old content if "Clear Copy Content" is selected
        if (this.isClearCopyContent) {
          try {
            await this.fsService.deleteAllFiles('downloads/IQW');
            this.toastService.success('Old content cleared successfully.');
          } catch (err: any) {
            console.error('Error clearing old content:', err);
            this.toastService.error('Failed to clear old content.');
            return; // Stop further processing if clear failed
          }
        }

        // ✅ Step 2: List and copy files from USB → Downloads
        let usbFiles: any = await this.fsService.listAllFilesOnStorage(source + '/IQ');

        this.toastService.info('Copying files from pendrive...');
        // ⚠️ Await here so next step runs after copying completes


        this.fsService.copyFilesFromUSBToDownloads(usbFiles, this.isClearCopyContent);

        // ✅ Step 3: Refresh file list and update zone info
        let files: any = await this.fsService.listAllFilesOnStorage(destination);
        console.log('Copied files:', files);

        this.zone.run(async () => {
          this.zoneinfo = [];
          this.cdr.detectChanges();

          await new Promise(r => setTimeout(r, 50));

          this.zoneinfo = [
            {
              cols: 1,
              height: 0,
              id: Date.now(),
              ismute: 'true',
              media_list: files,
              rows: 1,
              width: 0,
              x: 0,
              y: 0,
            },
          ];
          this.cdr.detectChanges();
          this.toastService.success('Files copied and updated.');
          console.log('Updated zoneinfo:', this.zoneinfo);
          this.zoneCompletionMap = {};
          this.dialog.closeAll();
        });

      }
    } else {
      // ❌ Show appropriate error
      if (!hasPendriveWithIQ) {
        this.toastService.error('No pendrive with “IQ” folder detected.');
      } else if (!hasEnoughSpace) {
        this.toastService.error('Insufficient storage space available.');
      }
    }
  }

}

