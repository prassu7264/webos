import { Component, ElementRef, HostListener, OnInit, QueryList, TemplateRef, ViewChild, ViewChildren } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';
import { ToastService } from '../../services/toast.service';
import { clienturl } from 'src/app/api-base';
@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {
  @ViewChild('stepper') stepper: MatStepper | any;
  @ViewChildren('stepContent') stepContents!: QueryList<ElementRef>;
  @ViewChild('yesBtn') yesBtn!: ElementRef<HTMLButtonElement>;
  deviceInfo: any = {};
  @ViewChild('logoutconfirm', { static: true }) logoutconfirm!: TemplateRef<any>;
  version = clienturl.CURRENT_VERSION();
  dialogRef: any
  radioOptions = [
    {
      id: 1,
      title: 'Device details',
      description: 'View detailed information about the connected device, including hardware specifications and status.',
      icon: './assets/images/drawable/info.png',
      device: true
    },
    // { 
    //   id: 2, 
    //   title: 'User Manual', 
    //   description: 'Access the user manual for instructions on how to operate and troubleshoot the device.', 
    //   icon: './assets/images/drawable/information.png' 
    // },
    // { 
    //   id: 3, 
    //   title: 'Mode Configuration', 
    //   description: 'Configure the operational modes of the device to suit different scenarios or use cases.', 
    //   icon: './assets/images/drawable/cogwheel.png' 
    // },
    // { 
    //   id: 4, 
    //   title: 'OTA Upgrade', 
    //   description: 'Perform over-the-air (OTA) updates to ensure the device is running the latest firmware and software.', 
    //   icon: './assets/images/drawable/uparrow.png' 
    // },
    // { 
    //   id: 5, 
    //   title: 'Network Settings', 
    //   description: 'Manage network settings to configure Wi-Fi, Ethernet, and other connectivity options for the device.', 
    //   icon: './assets/images/drawable/networksettingslogo.png' 
    // },
    {
      id: 6,
      title: 'Logout',
      description: 'Log out of the system to end the current session securely.',
      icon: './assets/images/logout.png',
      islogout: true
    }
  ];


  constructor(private dialog: MatDialog, private authService: AuthService, private toastService: ToastService) {

    this.deviceInfo = JSON.parse(sessionStorage.getItem('device') || '{}');
    console.log(this.deviceInfo);


  }
  ngOnInit(): void {

  }
 


  openLogoutDialog(): void {
    if (this.dialogRef) {
      // If the dialog is already open, return early to prevent reopening
      console.log('Dialog is already open!');
      return;
    }
    this.dialogRef = this.dialog.open(this.logoutconfirm, {
      minWidth: '450px'
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


 


  // Reset stepper on cancel
  cancel() {
    this.stepper.reset();
  }
}
