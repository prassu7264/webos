import { Component, ElementRef, HostListener, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SpeedTestService } from './_core/services/speed-test.service';



@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  private lastEnterPressTime = 0;
  netspeed: any;
  intervalId: any;
  isLoginPage = false;
  @ViewChild('exitconfirm', { static: true }) exitconfirm!: TemplateRef<any>;
  @ViewChild('DeviceSettings', { static: true }) deviceSettings!: TemplateRef<any>;
  dialogRef: any
  constructor(private dialog: MatDialog, private speedTestService: SpeedTestService) {
  }
  async ngOnInit() {
    window.onpopstate = () => {
      history.go(1);
      this.exitApp();
    };
    
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  // Method to open the dialog
  openInstallDialog(): void {
    if (this.dialogRef) {
      // If the dialog is already open, return early to prevent reopening
      console.log('Dialog is already open!');
      return;
    }
    this.dialogRef = this.dialog.open(this.deviceSettings, {
      width: '100vw'
    });

    this.dialogRef.afterClosed().subscribe((result: any) => {
      console.log('Dialog closed with result:', result);
      // Handle the result here if necessary
      this.dialogRef = null;
    });
  }


  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    console.log('Key pressed, keyCode:', event.keyCode);

    switch (event.keyCode) {
      case 13: // Enter / OK
        const now = Date.now();
        const delta = now - this.lastEnterPressTime;
        this.lastEnterPressTime = now;
        console.log("Enter key pressed");
        if (delta < 1000) {

          if (sessionStorage.getItem("device")) {
            this.openInstallDialog();
            // setTimeout(() => {
            //   this.dialogRef.close();
            //   Swal.close();
            // }, 60000);
          }

        }
        break;
      case 10009:
        this.exitApp();
        break;
      default:
        console.log('Key pressed, keyCode(default):', event.keyCode);

    }
  }

  exitApp() {
    try {

      if (typeof window !== "undefined" && (window as any).webOS?.platformBack) {
        console.log("Exiting via webOS.platformBack()");
        (window as any).webOS.platformBack();
        return;
      }


      if (this.dialogRef) {
        console.log('Dialog is already open!');
        return;
      }
      this.dialogRef = this.dialog.open(this.exitconfirm, {
        minWidth: '450px'
      });

      this.dialogRef.afterClosed().subscribe((result: any) => {
        console.log('Dialog closed with result:', result);
        if (result) {
          window.close();
        }
        this.dialogRef = null;
      });


    } catch (err) {
      console.error("❌ exitApp error:", err);
    }
  }
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    const focusable = Array.from(
      document.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => !el.hasAttribute('disabled'));

    const index = focusable.indexOf(document.activeElement as HTMLElement);

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {

      const next = (index + 1) % focusable.length;
      focusable[next].focus();
      event.preventDefault();
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      const prev = (index - 1 + focusable.length) % focusable.length;
      focusable[prev].focus();
      event.preventDefault();
    }

    if (event.key === 'Enter') {

      (document.activeElement as HTMLElement)?.click();
    }
    const isPopupOpen = this.dialog.openDialogs.length > 0;
    if (isPopupOpen) {
      if (event.key === 'Escape' || event.keyCode === 461) {
        this.dialog.closeAll();
        console.log('Popup closed');
      } else {
        event.preventDefault();
        event.stopPropagation();
        console.log('Blocked key:', event.key);
      }
      return;
    }
  }

}
