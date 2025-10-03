// /* webos-download.service.ts */
// import { Injectable } from '@angular/core';
// import { AuthService } from './auth.service';
// import { of, BehaviorSubject } from 'rxjs';
// import { switchMap } from 'rxjs/operators';
// import { WebosService } from './webos-service';

// export interface DownloadedMedia {
// 	url: string;
// 	fileName: string;
// 	localPath: string; // absolute path returned by the system or fallback url
// 	type: 'image' | 'video' | 'pdf' | 'youtube' | 'other';
// 	size?: number;
// 	downloadedAt?: number;
// 	progress?: number;
// 	attempts?: number;
// 	lastError?: string | null;
// }

// @Injectable({ providedIn: 'root' })
// export class WebosDownloadService {
// 	private readonly APP_ID = 'com.smarttv.launchapp';
// 	private readonly downloadsKey = 'downloaded_media_index';

// 	// recommended sandbox location (developer-installed apps)
// 	private readonly appSandboxDir = `/media/developer/apps/usr/palm/applications/${this.APP_ID}/downloads`;
// 	// fallback global internal downloads (most devices expose /media/internal/downloads)
// 	private readonly internalDownloadsDir = 'downloads';

// 	private downloaded: DownloadedMedia[] = [];

// 	// overall progress: BehaviorSubject exposed as observable
// 	private overallProgressSubject = new BehaviorSubject<number>(0);
// 	public overallProgress$ = this.overallProgressSubject.asObservable();

// 	// small concurrency limit so downloads don't starve playback
// 	private concurrentDownloads = 3;
// 	private activeCount = 0;
// 	private queue: (() => void)[] = [];

// 	constructor(private auth: AuthService, private webos: WebosService) {
// 		this.loadIndex();
// 	}

// 	private loadIndex() {
// 		try {
// 			const raw = localStorage.getItem(this.downloadsKey);
// 			this.downloaded = raw ? JSON.parse(raw) : [];
// 		} catch (e) {
// 			console.warn('Failed to load download index', e);
// 			this.downloaded = [];
// 		}
// 		this.updateOverallProgress();
// 	}

// 	private saveIndex() {
// 		try {
// 			localStorage.setItem(this.downloadsKey, JSON.stringify(this.downloaded));
// 		} catch (e) {
// 			console.warn('Failed to save download index', e);
// 		}
// 	}

// 	getDownloadedList(): DownloadedMedia[] {
// 		return [...this.downloaded];
// 	}

// 	findDownloaded(url: string): DownloadedMedia | null {
// 		const found = this.downloaded.find(d => d.url === url);
// 		return found ?? null;
// 	}

// 	private makeFileName(url: string, idx?: number) {
// 		const urlNoQuery = url.split('?')[0];
// 		const base = urlNoQuery.split('/').pop() || `media_${Date.now()}`;
// 		const safe = `${Date.now()}_${idx ?? ''}_${base}`.replace(/\s+/g, '_');
// 		return safe;
// 	}

// 	/**
// 	 * Enqueue work helper to respect concurrency
// 	 */
// 	private enqueueWork(fn: () => void) {
// 		this.queue.push(fn);
// 		this.processQueue();
// 	}
// 	private processQueue() {
// 		if (this.activeCount >= this.concurrentDownloads) return;
// 		const job = this.queue.shift();
// 		if (!job) return;
// 		this.activeCount++;
// 		try {
// 			job();
// 		} finally {
// 			// job itself is responsible for decrementing activeCount when finished
// 		}
// 	}

// 	/**
// 	 * Public: download single file
// 	 * Tries app sandbox first (absolute sandbox path), falls back to internal downloads,
// 	 * and updates progress via progressCb. Returns a promise that resolves to DownloadedMedia.
// 	 */
// 	async enqueueDownload(
// 	    url: string,
// 	    type: DownloadedMedia['type'],
// 	    idx?: number,
// 	    progressCb?: (percent: number) => void,
// 	    maxAttempts = 3
// 	): Promise<DownloadedMedia> {
// 	    // return existing
// 	    const existing = this.findDownloaded(url);
// 	    if (existing) return existing;

// 	    const fileName = this.makeFileName(url, idx);

// 	    return new Promise<DownloadedMedia>((outerResolve, outerReject) => {
// 	        let attempts = 0;

// 	        const tryDownload = (attemptCallback: (err?: any, result?: DownloadedMedia) => void) => {
// 	            attempts++;

// 	            const params = {
// 	                target: url,
// 	                targetDir: `/media/developer/apps/usr/palm/applications/${this.APP_ID}`,        //  sandbox folder only
// 	                targetFilename: fileName,
// 	                subscribe: true
// 	            };

// 	            let lastResolved = false;

// 	            try {
// 	                this.webos.subscribe<any>(
// 	                    'luna://com.webos.service.downloadmanager/download',
// 	                    params,
// 	                    (res) => {
// 	                        console.log('DownloadManager response:', res);

// 	                        if (!res || res.returnValue === false) {
// 	                            const errText = res?.errorText || JSON.stringify(res);
// 	                            console.warn('Download failed (downloadmanager):', errText);
// 	                            attemptCallback({ message: errText }, undefined);
// 	                            return;
// 	                        }

// 	                        // progress
// 	                        if (res.amountReceived || res.percent) {
// 	                            const p = res.percent ??
// 	                                (res.amountReceived && res.amountTotal
// 	                                    ? Math.floor((res.amountReceived / res.amountTotal) * 100)
// 	                                    : 0);
// 	                            if (progressCb) progressCb(p);
// 	                        }

// 	                        // completed
// 	                        if (res.completed) {
// 	                            const absolutePath = `file:///media/developer/apps/usr/palm/applications/${this.APP_ID}/${fileName}`;

// 	                            const item: DownloadedMedia = {
// 	                                url,
// 	                                fileName,
// 	                                localPath: absolutePath, //  always usable with <video>/<img>
// 	                                type,
// 	                                downloadedAt: Date.now(),
// 	                                progress: 100,
// 	                                attempts
// 	                            };
// 	                            this.downloaded.push(item);
// 	                            this.saveIndex();
// 	                            this.updateOverallProgress();

// 	                            if (!lastResolved) {
// 	                                lastResolved = true;
// 	                                attemptCallback(undefined, item);
// 	                            }
// 	                        }
// 	                    }
// 	                );
// 	            } catch (err) {
// 	                console.error('subscribe() threw', err);
// 	                attemptCallback(err, undefined);
// 	            }
// 	        }; // tryDownload

// 	        // Worker with retry + backoff
// 	        const startWorker = () => {
// 	            const runAttempt = (tryCount = 0) => {
// 	                if (tryCount >= maxAttempts) {
// 	                    outerReject(new Error('All download attempts failed'));
// 	                    this.activeCount = Math.max(0, this.activeCount - 1);
// 	                    this.processQueue();
// 	                    return;
// 	                }

// 	                tryDownload((err, result) => {
// 	                    if (!err && result) {
// 	                        outerResolve(result);
// 	                        this.activeCount = Math.max(0, this.activeCount - 1);
// 	                        this.processQueue();
// 	                    } else {
// 	                        const backoffMs = Math.pow(2, tryCount) * 500;
// 	                        console.log(`Retrying download in ${backoffMs}ms`);
// 	                        setTimeout(() => runAttempt(tryCount + 1), backoffMs);
// 	                    }
// 	                });
// 	            };

// 	            runAttempt();
// 	        };

// 	        this.enqueueWork(startWorker);
// 	    });
// 	}

// 	getDownloadedMap(): Record<string, DownloadedMedia> {
// 		return this.downloaded.reduce((map, item) => {
// 			map[item.url] = item;
// 			return map;
// 		}, {} as Record<string, DownloadedMedia>);
// 	}



// 	/** Remove index only (doesn't try to delete files) */
// 	clearIndex() {
// 		this.downloaded = [];
// 		this.saveIndex();
// 		this.updateOverallProgress();
// 	}

// 	// sync from remote and kick off background downloads (non-blocking)
// 	syncAndDownloadMedia(payload: any) {
// 		return this.auth.getMediafiles(payload).pipe(
// 			switchMap((res: any) => {
// 				if (Array.isArray(res?.data)) {
// 					this.backgroundDownloadList(res.data);
// 					return of({
// 						onlineList: res.data,
// 						offlineList: this.getDownloadedList()
// 					});
// 				}
// 				return of({ onlineList: [], offlineList: this.getDownloadedList() });
// 			})
// 		);
// 	}

// 	// Background list ensures concurrency + retry and updates overall progress
// 	backgroundDownloadList(mediaList: { Url: string, type?: string }[]) {
// 		const total = mediaList.length;
// 		mediaList.forEach((m, i) => {
// 			const type = (m.type as any) || this.guessTypeFromUrl(m.Url);
// 			if (type === 'youtube' || type === 'pdf') return;
// 			if (this.findDownloaded(m.Url)) return;

// 			// schedule but non-blocking - the enqueueDownload will manage concurrency
// 			this.enqueueDownload(m.Url, type as any, i, (percent) => {
// 				const existing = this.downloaded.find(d => d.url === m.Url);
// 				if (existing) existing.progress = percent;
// 				this.updateOverallProgress();
// 			}).then(item => {
// 				// done
// 				this.updateOverallProgress();
// 			}).catch(err => {
// 				console.warn('background download failed for', m.Url, err);
// 			});
// 		});
// 	}

// 	private updateOverallProgress() {
// 		const list = this.getDownloadedList();
// 		if (!list.length) {
// 			this.overallProgressSubject.next(0);
// 			return;
// 		}
// 		// sum the progress (use 100 for completed)
// 		const sum = list.reduce((acc, cur) => acc + (cur.progress ?? 0), 0);
// 		const progress = Math.floor(sum / list.length);
// 		this.overallProgressSubject.next(progress);
// 	}

// 	private guessTypeFromUrl(url: string): DownloadedMedia['type'] {
// 		const u = (url || '').toLowerCase();
// 		if (!u) return 'other';
// 		if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
// 		if (u.endsWith('.pdf')) return 'pdf';
// 		if (u.match(/\.(mp4|mov|webm|mkv|avi)$/)) return 'video';
// 		if (u.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/)) return 'image';
// 		return 'other';
// 	}
// }

// /* webos-download.service.ts */
// import { Injectable } from '@angular/core';
// import { BehaviorSubject } from 'rxjs';
// import { WebosService } from './webos-service';

// export interface DownloadedMedia {
//   url: string;
//   fileName: string;
//   localPath: string;   // usable directly in <video>/<img>
//   type: 'image' | 'video' | 'pdf' | 'youtube' | 'other';
//   downloadedAt?: number;
//   progress?: number;
//   attempts?: number;
// }

// @Injectable({ providedIn: 'root' })
// export class WebosDownloadService {
//   private readonly APP_ID = 'com.smarttv.launchapp';
//   private readonly appSandboxDir = `/media/developer/apps/usr/palm/applications/${this.APP_ID}/downloads`;

//   private downloaded: DownloadedMedia[] = [];
//   private overallProgressSubject = new BehaviorSubject<number>(0);
//   public overallProgress$ = this.overallProgressSubject.asObservable();

//   constructor(private webos: WebosService) {}

//   // ───────────────────────────────────────────────
//   // Core fetch-based download logic
//   // ───────────────────────────────────────────────
//   async enqueueDownload(
//     url: string,
//     type: DownloadedMedia['type'],
//     idx?: number,
//     progressCb?: (percent: number) => void,
//     maxAttempts = 3
//   ): Promise<DownloadedMedia> {
//     const fileName = this.makeFileName(url, idx);
//     let attempts = 0;

//     const downloadFile = async (): Promise<DownloadedMedia> => {
//       attempts++;
//       try {
//         const res = await fetch(url);
//         if (!res.ok) throw new Error(`HTTP error ${res.status}`);

//         const blob = await res.blob();
//         const array = Array.from(new Uint8Array(await blob.arrayBuffer()));

//         // write to sandbox folder
//         await this.webos.call('luna://com.webos.service.fs/writeFile', {
//           path: `${this.appSandboxDir}/${fileName}`,
//           data: array,
//           overwrite: true
//         });

//         const item: DownloadedMedia = {
//           url,
//           fileName,
//           localPath: `file://${this.appSandboxDir}/${fileName}`,
//           type,
//           downloadedAt: Date.now(),
//           progress: 100,
//           attempts
//         };
//         this.downloaded.push(item);
//         this.updateOverallProgress();
//         return item;

//       } catch (err) {
//         if (attempts < maxAttempts) {
//           return downloadFile(); // retry
//         } else {
//           throw err;
//         }
//       }
//     };

//     return downloadFile();
//   }

//   // ───────────────────────────────────────────────
//   // Batch download
//   // ───────────────────────────────────────────────
//    public backgroundDownloadList(mediaList: { Url: string, type: string }[]) {
//     (mediaList || []).forEach(m => {
//       const url = (m.Url || '').toString();
//       if (!url) return;
//       this.enqueueDownload(url, m.type as any).catch(err =>
//         console.warn('Background download failed', url, err)
//       );
//     });
//   }

//   // ───────────────────────────────────────────────
//   // Helpers
//   // ───────────────────────────────────────────────
//   getDownloadedMap() {
//     return this.downloaded.reduce((acc, cur) => {
//       acc[cur.url] = cur;
//       return acc;
//     }, {} as Record<string, DownloadedMedia>);
//   }

//   findDownloaded(url: string) {
//     return this.downloaded.find(d => d.url === url);
//   }

//   private makeFileName(url: string, idx?: number) {
//     const urlNoQuery = url.split('?')[0];
//     const base = urlNoQuery.split('/').pop() || `media_${Date.now()}`;
//     return `${Date.now()}_${idx ?? ''}_${base}`.replace(/\s+/g, '_');
//   }

//   private updateOverallProgress() {
//     if (!this.downloaded.length) {
//       this.overallProgressSubject.next(0);
//       return;
//     }
//     const sum = this.downloaded.reduce((acc, cur) => acc + (cur.progress ?? 0), 0);
//     this.overallProgressSubject.next(Math.floor(sum / this.downloaded.length));
//   }

//   private guessTypeFromUrl(url: string): DownloadedMedia['type'] {
//     const u = url.toLowerCase();
//     if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
//     if (u.endsWith('.pdf')) return 'pdf';
//     if (u.match(/\.(mp4|mov|webm|mkv|avi)$/)) return 'video';
//     if (u.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/)) return 'image';
//     return 'other';
//   }
// }
/* webos-download.service.ts */
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface DownloadedMedia {
	url: string;            // original URL
	fileName: string;
	type: 'image' | 'video' | 'pdf' | 'youtube' | 'other';
	downloadedAt?: number;
	progress?: number;      // 0 - 100
	attempts?: number;
	localUrl?: string;      // Blob URL for playback
}

@Injectable({ providedIn: 'root' })
export class WebosDownloadService {
	private downloaded: DownloadedMedia[] = [];
	private overallProgressSubject = new BehaviorSubject<number>(0);
	public overallProgress$ = this.overallProgressSubject.asObservable();

	constructor() { }
	

	// ────────────────────────────────
	// Core download logic using fetch + Blob
	// ────────────────────────────────
	async enqueueDownload(
		url: string,
		type: DownloadedMedia['type'],
		idx?: number,
		progressCb?: (percent: number) => void,
		maxAttempts = 3
	): Promise<DownloadedMedia> {
		url = this.cleanUrl(url);
		const fileName = this.makeFileName(url, idx);
		let attempts = 0;

		const downloadFile = async (): Promise<DownloadedMedia> => {
			attempts++;
			try {
				const res = await fetch(url);
				if (!res.ok) throw new Error(`HTTP error ${res.status}`);

				const contentLength = res.headers.get('Content-Length');
				const total = contentLength ? parseInt(contentLength, 10) : 0;

				const reader = res.body?.getReader();
				const chunks: Uint8Array[] = [];
				let received = 0;

				if (reader) {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						if (value) {
							chunks.push(value);
							received += value.length;
							if (total && progressCb) {
								progressCb(Math.floor((received / total) * 100));
							}
						}
					}
				}

				const blob = new Blob(chunks);
				const localUrl = window.URL.createObjectURL(blob);

				const item: DownloadedMedia = {
					url,
					fileName,
					type,
					localUrl,
					downloadedAt: Date.now(),
					progress: 100,
					attempts
				};

				this.downloaded.push(item);
				this.updateOverallProgress();
				return item;

			} catch (err) {
				if (attempts < maxAttempts) {
					return downloadFile(); // retry
				} else {
					console.warn(`Failed to download ${url}`, err);
					throw err;
				}
			}
		};

		return downloadFile();
	}

	// ────────────────────────────────
	// Background download list
	// ────────────────────────────────
	public backgroundDownloadList(mediaList: { Url: string; type: string }[]) {
		// (mediaList || []).forEach(m => {
		// 	let url = this.cleanUrl(m.Url);
		// 	if (!url) return;
		// 	this.enqueueDownload(url, m.type as any).catch(err =>
		// 		console.warn('Background download failed', url, err)
		// 	);
		// });
		
	}

	// ────────────────────────────────
	// Helpers
	// ────────────────────────────────
	getDownloadedMap() {
		return this.downloaded.reduce((acc, cur) => {
			acc[cur.url] = cur;
			return acc;
		}, {} as Record<string, DownloadedMedia>);
	}

	findDownloaded(url: string) {
		url = this.cleanUrl(url);
		return this.downloaded.find(d => d.url === url);
	}

	private makeFileName(url: string, idx?: number) {
		const urlNoQuery = url.split('?')[0];
		const base = urlNoQuery.split('/').pop() || `media_${Date.now()}`;
		return `${Date.now()}_${idx ?? ''}_${base}`.replace(/\s+/g, '_');
	}

	private updateOverallProgress() {
		if (!this.downloaded.length) {
			this.overallProgressSubject.next(0);
			return;
		}
		const sum = this.downloaded.reduce((acc, cur) => acc + (cur.progress ?? 0), 0);
		this.overallProgressSubject.next(Math.floor(sum / this.downloaded.length));
	}

	private guessTypeFromUrl(url: string): DownloadedMedia['type'] {
		const u = (url || '').toLowerCase();
		if (!u) return 'other';
		if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
		if (u.endsWith('.pdf')) return 'pdf';
		if (u.match(/\.(mp4|mov|webm|mkv|avi)$/)) return 'video';
		if (u.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/)) return 'image';
		return 'other';
	}

	private cleanUrl(url: string): string {
		return (url || '').toString().trim().replace(/^"+|"+$/g, '');
	}
}
