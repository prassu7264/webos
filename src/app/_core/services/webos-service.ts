import { Injectable } from '@angular/core';

declare var PalmServiceBridge: any;

@Injectable({ providedIn: 'root' })
export class WebosService {
  /**
   * Single-shot call (Promise-based).
   * Each call gets its own PalmServiceBridge instance.
   */
  call<T = any>(uri: string, params: any = {}): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (typeof PalmServiceBridge === 'undefined') {
        reject(new Error('PalmServiceBridge not available (not running on webOS)'));
        return;
      }

      const bridge = new PalmServiceBridge();

      try {
        bridge.onservicecallback = (msg: string) => {
          try {
            const res = JSON.parse(msg);
            if (res.returnValue === false) {
              reject(new Error(res.errorText || 'Service call failed'));
            } else {
              resolve(res);
            }
          } catch (err) {
            reject(err);
          }
        };

        bridge.call(uri, JSON.stringify(params));
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Continuous subscription (streaming responses).
   * Caller is responsible for keeping reference to stop it.
   */
  subscribe<T = any>(uri: string, params: any, cb: (res: T) => void): any {
    if (typeof PalmServiceBridge === 'undefined') {
      console.warn('PalmServiceBridge not available');
      return null;
    }

    const bridge = new PalmServiceBridge();

    bridge.onservicecallback = (msg: string) => {
      try {
        const res = JSON.parse(msg);
        cb(res);
      } catch (e) {
        console.error('Subscribe parse error', e);
      }
    };

    bridge.call(uri, JSON.stringify({ ...(params || {}), subscribe: true }));

    return bridge; // so caller can cancel later with bridge.cancel()
  }
}
