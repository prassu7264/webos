import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class OfflinePlayerService {
  private readonly DB_NAME = 'WebOSDownloads';
  private readonly STORE_NAME = 'files';

  constructor() {}

  /** Open IndexedDB */
  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME);

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /** Get all downloaded files (metadata only) */
  async getAllDownloads(): Promise<any[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  /** Get playable URL for given filename (rehydrate blob) */
  async getPlayableUrl(fileName: string): Promise<string | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      const getReq = store.get(fileName);

      getReq.onsuccess = () => {
        const file = getReq.result;
        if (file && file.blob) {
          const url = URL.createObjectURL(file.blob);
          resolve(url);
        } else {
          resolve(null);
        }
      };

      getReq.onerror = () => reject(getReq.error);
    });
  }

  /** Example: cleanup old object URLs */
  revokeUrl(url: string) {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
}
