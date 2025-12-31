import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LoggerService } from '../services/logger.service';

@Injectable({
  providedIn: 'root'
})
export class DeviceInfoService {

  private deviceUIDSubject = new BehaviorSubject<string | null>(null);
  deviceUID$ = this.deviceUIDSubject.asObservable();

  constructor(private logger: LoggerService) {
    this.logger.info('DeviceInfoService.constructor', 'DeviceInfoService initialized');
    this.initDeviceUID();
  }

  async initDeviceUID(): Promise<string> {
    // return existing UID if already initialized
    const currentUID = this.deviceUIDSubject.getValue();
    if (currentUID) {
      this.logger.log('initDeviceUID', 'Using cached device UID');
      return currentUID;
    }

    this.logger.info('initDeviceUID', 'Resolving device UID');

    let uid: string = "";

    // ✅ webOS (PalmServiceBridge)
    if (typeof window !== "undefined" && (window as any).PalmServiceBridge) {
      this.logger.info('initDeviceUID', 'Platform detected: webOS');
      uid = await new Promise((resolve) => {
        try {
          const bridge = new (window as any).PalmServiceBridge();
          const url =
            "luna://com.webos.service.tv.systemproperty/getSystemInfo";
          const params = JSON.stringify({
            keys: ["serialNumber", "modelName", "firmwareVersion", "deviceId"],
          });

          bridge.onservicecallback = (msg: any) => {
            try {
              const res = JSON.parse(msg);
              if (res.returnValue && res.serialNumber) {
                console.log("✅ webOS Serial:", res.serialNumber);
                console.log("Model:", res.modelName, "FW:", res.firmwareVersion);
                resolve(res.serialNumber);
              } else {
                console.log("⚠️ webOS serial not found, using deviceId/fallback");
                resolve(res.deviceId || crypto.randomUUID());
              }
            } catch (err) {
              console.error("❌ webOS parse error:", err);
              resolve(crypto.randomUUID());
            }
          };

          bridge.call(url, params);
        } catch (err) {
          console.error("❌ PalmServiceBridge failed:", err);
          resolve(crypto.randomUUID());
        }
      });

      // ✅ Samsung Tizen (webapis.productinfo)
    } else if (typeof window !== "undefined" && (window as any).webapis?.productinfo) {
      this.logger.info('initDeviceUID', 'Platform detected: Tizen');
      try {
        const productInfo = (window as any).webapis.productinfo;
        console.log(productInfo);
        uid = productInfo.getDuid();
        this.logger.info('initDeviceUID', 'Tizen DUID resolved');
      } catch (error: any) {
        this.logger.error(
          'initDeviceUID',
          'Tizen getDuid failed',
          error?.message || error
        );
        uid = crypto.randomUUID();
      }

    } else {
      this.logger.warn('initDeviceUID', 'Platform unknown — using fallback UID');
      uid = localStorage.getItem("fallback_duid") || crypto.randomUUID();
      localStorage.setItem("fallback_duid", uid);
      console.log("⚠️ Using fallback UID:", uid);
    }

    this.deviceUIDSubject.next(uid);

    this.logger.info('initDeviceUID', 'Device UID resolved', {
      source: uid ? 'resolved' : 'unknown'
    });

    return uid;
  }

  // async initDeviceUID(): Promise<string> {
  //   // return existing UID if already initialized
  //   const currentUID = this.deviceUIDSubject.getValue();
  //   if (currentUID) return currentUID;

  //   let uid: string;

  //   if (typeof window !== 'undefined' && (window as any).PalmServiceBridge) {
  //     uid = await new Promise((resolve) => {
  //       try {
  //         const bridge = new (window as any).PalmServiceBridge();
  //         const url = "luna://com.webos.service.tv.systemproperty/getSystemInfo";
  //         const params = JSON.stringify({
  //           keys: ["serialNumber", "modelName", "firmwareVersion", "deviceId"]
  //         });

  //         bridge.onservicecallback = (msg: any) => {
  //           try {
  //             const res = JSON.parse(msg);
  //             if (res.returnValue && res.serialNumber) {
  //               console.log("Got Serial via PalmServiceBridge:", res.serialNumber);
  //               resolve(res.serialNumber);
  //             } else {
  //               console.warn("Serial not found, using deviceId or fallback");
  //               resolve(res.deviceId || crypto.randomUUID());
  //             }
  //           } catch (err) {
  //             console.error("Error parsing response", err);
  //             resolve(crypto.randomUUID());
  //           }
  //         };

  //         bridge.call(url, params);
  //       } catch (err) {
  //         console.error("PalmServiceBridge failed:", err);
  //         resolve(crypto.randomUUID());
  //       }
  //     });
  //   } else {
  //     // fallback for non-webOS browsers/dev
  //     uid = localStorage.getItem('fallback_duid') || crypto.randomUUID();
  //     localStorage.setItem('fallback_duid', uid);
  //   }

  //   this.deviceUIDSubject.next(uid);
  //   return uid;
  // }

  getDeviceUID(): string | null {
    return this.deviceUIDSubject.getValue();
  }
}
