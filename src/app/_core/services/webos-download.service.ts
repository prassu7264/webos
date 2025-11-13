import { Injectable } from '@angular/core';

export interface DownloadedMedia {
	url: string;
	type: 'video' | 'image' | 'pdf' | 'youtube' | 'other';
	timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class WebosDownloadService {
	private cache: Record<string, DownloadedMedia> = {};
	private CACHE_KEY = 'mediaCacheMap';
	private MAX_CACHE_ITEMS = 20; // adjust for your 1GB limit (20 videos ~ 800MB)

	constructor() {
		this.loadCacheMap();
	}

	/**  Load cached metadata from localStorage */
	private loadCacheMap() {
		try {
			const data = localStorage.getItem(this.CACHE_KEY);
			if (data) this.cache = JSON.parse(data);
		} catch (err) {
			console.warn('Failed to load cache map', err);
		}
	}

	/**  Persist cache map */
	private saveCacheMap() {
		try {
			localStorage.setItem(this.CACHE_KEY, JSON.stringify(this.cache));
		} catch (err) {
			console.warn('Failed to save cache map', err);
		}
	}

	/**  Check if file already cached */
	isFileCached(url: string): boolean {
		const norm = this.normalize(url);
		return !!this.cache[norm];
	}

	/** Get cached file record */
	getCachedFile(url: string): DownloadedMedia | null {
		const norm = this.normalize(url);
		return this.cache[norm] || null;
	}

	/**  Cache a file (only metadata simulation for now) */
	async cacheFile(url: string, type: DownloadedMedia['type']): Promise<void> {
		const norm = this.normalize(url);

		// simulate caching (in real webOS we’d use FileSystem or webOS File API)
		this.cache[norm] = { url, type, timestamp: Date.now() };
		this.cleanupOldEntries();
		this.saveCacheMap();

		console.log('✅ Cached file (metadata only):', norm);
	}

	/**  Cleanup old cache entries */
	private cleanupOldEntries() {
		const keys = Object.keys(this.cache);
		if (keys.length <= this.MAX_CACHE_ITEMS) return;

		const sorted = keys.sort((a, b) => this.cache[a].timestamp - this.cache[b].timestamp);
		const removeCount = keys.length - this.MAX_CACHE_ITEMS;
		for (let i = 0; i < removeCount; i++) {
			delete this.cache[sorted[i]];
		}
	}

	/**  Remove all cache except listed */
	cleanupCacheExcept(keepUrls: string[]) {
		const normalizedKeep = keepUrls.map(u => this.normalize(u));
		for (const key of Object.keys(this.cache)) {
			if (!normalizedKeep.includes(key)) delete this.cache[key];
		}
		this.saveCacheMap();
		console.log('🧹 Cache cleanup complete. Keeping:', normalizedKeep.length, 'files');
	}

	/**  Normalize URL (strip query params etc.) */
	normalize(url: string): string {
		if (!url || typeof url !== 'string') return '';
		// remove query params but KEEP original case
		return url.split('?')[0].trim();
	}


	/**  Compatibility: keep older function for downloadedMap */
	getDownloadedMap() {
		return this.cache;
	}

	/**  Compatibility: optional background downloader stub */
	backgroundDownloadList(files: { Url: string; type: string }[]) {
		files.forEach(f => {
			const norm = this.normalize(f.Url);
			if (!this.cache[norm]) {
				this.cacheFile(f.Url, f.type as any);
			}
		});
	}
}
