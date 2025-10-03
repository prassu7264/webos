import { Component, OnInit } from '@angular/core';

declare var webOS: any; // webOS global object

@Component({
  selector: 'app-usb-reader',
  templateUrl: './usb-reader.component.html',
  // styleUrls: ['./usb-reader.component.css']
})
export class UsbReaderComponent implements OnInit {
  devices: any[] = [];
  files: any[] = [];
  error: string | null = null;

  ngOnInit() {
    this.listUsbDevices();
  }

  listUsbDevices() {
    if (typeof webOS === 'undefined' || !webOS.service) {
      this.error = 'webOS service API not available (running in browser?)';
      return;
    }

    // Call webOS storage service
    webOS.service.request('luna://com.webos.service.storageaccess', {
      method: 'getDeviceList',
      parameters: {},
      onSuccess: (res: any) => {
        if (res.devices) {
          this.devices = res.devices;
          console.log('USB Devices:', res.devices);

          // Auto-load first device
          if (this.devices.length > 0) {
            this.listFiles(this.devices[0].deviceId);
          }
        }
      },
      onFailure: (err: any) => {
        this.error = `Failed to list devices: ${JSON.stringify(err)}`;
      }
    });
  }

  listFiles(deviceId: string) {
    webOS.service.request('luna://com.webos.service.storageaccess', {
      method: 'listFiles',
      parameters: {
        deviceId: deviceId,
        path: '/record'   // root of USB
      },
      onSuccess: (res: any) => {
        if (res.files) {
          this.files = res.files;
          console.log('Files:', res.files);
        }
      },
      onFailure: (err: any) => {
        this.error = `Failed to list files: ${JSON.stringify(err)}`;
      },
      subscribe: true
    });
  }
}
