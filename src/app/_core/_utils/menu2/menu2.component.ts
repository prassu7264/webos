import { Component, Input, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { clienturl } from 'src/app/api-base';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { FilesystemService } from '../../services/filesystem.service';
import { NavigationEnd, Router } from '@angular/router';

@Component({
  selector: 'app-menu2',
  templateUrl: './menu2.component.html',
  styleUrls: ['./menu2.component.scss']
})
export class Menu2Component {
  deviceInfo: any = {};
  isChecked: any = true;
  @ViewChild('logoutconfirmfirst', { static: true }) logoutconfirm!: TemplateRef<any>;
  @ViewChild('logoutconfirmsecond', { static: true }) logoutconfirmsecond!: TemplateRef<any>;
  @ViewChild('modeConfiguration', { static: true }) modeConfiguration!: TemplateRef<any>;
  isLoginPage: boolean = false;
  currentDialogType: string | null = null;
  @ViewChild('devcieinfo', { static: true }) devcieinfo!: TemplateRef<any>;
  version = clienturl.CURRENT_VERSION();
  dialogRef: any
  dialogMap: any = {
    devcieinfo: this.devcieinfo,
    logout: this.logoutconfirm,
    modeConfiguration: this.modeConfiguration
  };
  radioOptions = [
    {
      id: 1,
      title: 'Device details',
      description: 'View detailed information about the connected device, including hardware specifications and status.',
      icon: './assets/images/info.png',
      type: "devcieinfo"
    },
    // {
    //   id: 2,
    //   title: 'User Manual',
    //   description: 'Access the user manual for instructions on how to operate and troubleshoot the device.',
    //   icon: './assets/images/information.png',
    //   type: "userManual"
    // },
    {
      id: 3,
      title: 'Mode Configuration',
      description: 'Configure the operational modes of the device to suit different scenarios or use cases.',
      icon: './assets/images/cogwheel.png',
      type: "modeConfiguration"
    },
    // {
    //   id: 4,
    //   title: 'OTA Upgrade',
    //   description: 'Perform over-the-air (OTA) updates to ensure the device is running the latest firmware and software.',
    //   icon: './assets/images/uparrow.png',
    //   type: "userManual"
    // },
    // {
    //   id: 5,
    //   title: 'Network Settings',
    //   description: 'Manage network settings to configure Wi-Fi, Ethernet, and other connectivity options for the device.',
    //   icon: './assets/images/technical-support.png',
    //   type: "networkSettings"
    // },
    {
      id: 6,
      title: 'Logout',
      description: 'Log out of the system to end the current session securely.',
      icon: './assets/images/logout.png',
      islogout: true,
      type: "logoutconfirm",
      isLoginPage: this.isLoginPage
    }
  ];
  storage: any;
  constructor(private dialog: MatDialog, private router: Router, private authService: AuthService, private toastService: ToastService, private fsService: FilesystemService) {
    this.deviceInfo = JSON.parse(sessionStorage.getItem('device') || '{}');
    console.log(this.deviceInfo);
    console.log(this.router.url);
    this.isLoginPage = this.router.url == '/login' && sessionStorage.getItem("isLogin") != "true"
  }


  ngOnInit(): void {
    this.getStorageInfo();

  }

  openDialog(type: string) {
    // Define all dialog mappings
    this.dialogMap = {
      devcieinfo: this.devcieinfo,
      logoutconfirm: this.logoutconfirm,
      modeConfiguration: this.modeConfiguration
    };

    const dialogComponent = this.dialogMap[type];
    this.isChecked = sessionStorage.getItem("ModeConfiguration") === "true";

    // 🛑 Check if invalid type
    if (!dialogComponent) {
      console.error(`Dialog type "${type}" not found!`);
      this.toastService.info(`"${type}" coming soon!`);
      return;
    }

    // 🛑 Prevent opening same popup again
    if (this.dialogRef && this.currentDialogType === type) {
      console.warn(`Dialog "${type}" already open — skipping.`);
      this.toastService.info(`${type} is already open.`);
      return;
    }

    // 🟢 Allow new popup — but close the old one first if different
    if (this.dialogRef) {
      this.dialogRef.close();
    }

    // ✅ Open new dialog
    this.currentDialogType = type;
    this.dialogRef = this.dialog.open(dialogComponent, {
      width: type === "devcieinfo" ? "60vw" : "30vw",
      disableClose: true
    });

    this.dialogRef.afterClosed().subscribe((result: any) => {
      console.log(`Dialog "${type}" closed with result:`, result);

      // Reset after close
      this.dialogRef = null;
      this.currentDialogType = null;
    });
  }


  openLogoutDialog(): void {

    this.dialogRef = this.dialog.open(this.logoutconfirmsecond, {
      minWidth: "30vw"
    });

    this.dialogRef.afterClosed().subscribe((result: any) => {
      console.log('Dialog closed with result:', result);

      let v = {
        isConfirmed: result === 'yes', isDenied: result === 'no'

      }
      if (result === 'yes' || result === 'no') {
        this.authService.logout(v).subscribe((res: any) => {
          this.toastService.success(res?.message || "Logged out successfully!!");
          this.dialog.closeAll();
        });
      }
      this.dialogRef = null;
    });
  }
  clearDownloads(type: any): void {
    if (type) {
      this.fsService.deleteAllFilesWithFolder('downloads')
        .then(() => {
          this.toastService.success('Storage cleared');
          this.fsService.createIQWFolderPath("/opt/usr/home/owner/content/Downloads")
          this.getStorageInfo();
          localStorage.removeItem("splitScreenList");
          this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
            this.router.navigate([this.router.url]);
          });


        })
        .catch((err: any) => {
          const message = err?.message || 'Failed to clear storage';
          this.toastService.error(message);
          console.error('Error clearing downloads:', err);
        });
    } else {
      this.fsService.deleteAllFiles('downloads')
        .then(() => {
          this.toastService.success('Downloads cleared');
          this.getStorageInfo();
          localStorage.removeItem("splitScreenList");
          this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
            this.router.navigate([this.router.url]);
          });
        })
        .catch((err: any) => {
          const message = err?.message || 'Failed to clear storage';
          this.toastService.error(message);
          console.error('Error clearing downloads:', err);
        });
    }

    this.fsService.listAllSubfolders("downloads").then(data => {
      console.log(data);
    })
  }
  getStorageInfo() {
    this.fsService.getStorageInfo().then(storage => {
      this.storage = storage;
    });
  }

  onChangeModeConfiguration(e: boolean) {
    if (this.isChecked) {
      this.dialog.closeAll();
      if (this.isLoginPage) {
        this.router.navigate(['/player'], { replaceUrl: true });
      }

      this.toastService.info("Pendrive mode on");

    }
    sessionStorage.setItem("ModeConfiguration", this.isChecked)
  }
}
