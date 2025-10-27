import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DeviceInfoService {

  private deviceUIDSubject = new BehaviorSubject<string | null>(null);
  deviceUID$ = this.deviceUIDSubject.asObservable();

  constructor() {
    this.initDeviceUID();
  }

  async initDeviceUID(): Promise<string> {
    // return existing UID if already initialized
    const currentUID = this.deviceUIDSubject.getValue();
    if (currentUID) return currentUID;

    let uid: string = "";

    //  webOS (PalmServiceBridge)
    if (typeof window !== "undefined" && (window as any).PalmServiceBridge) {
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
                console.warn("⚠️ webOS serial not found, using deviceId/fallback");
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

      //  Samsung Tizen (webapis.productinfo)
    } else if (typeof window !== "undefined" && (window as any).webapis?.productinfo) {
      try {
        const productInfo = (window as any).webapis.productinfo;
        console.log(productInfo);
        uid = productInfo.getDuid();
      } catch (error: any) {
        console.error("❌ Tizen webapis error:", error?.message || error);
        uid = crypto.randomUUID();
      }

    } else {
      uid = localStorage.getItem("fallback_duid") || crypto.randomUUID();
      localStorage.setItem("fallback_duid", uid);
      console.log("⚠️ Using fallback UID:", uid);
    }

    this.deviceUIDSubject.next(uid);
    return uid;
  }
  getDeviceUID(): string | null {
    return this.deviceUIDSubject.getValue();
  }
}
