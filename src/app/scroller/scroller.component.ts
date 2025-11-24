import { Component, Input, OnInit, OnDestroy, AfterViewInit, OnChanges, SimpleChanges, ElementRef, ViewChild } from '@angular/core';
import { loadFontDynamically } from '../utils/font-loader';

export interface ScrollerItem {
	id: number;
	message: string;
	bgcolor: string;
	fncolor: string;
	fnsize: string;
	fontname: string;
	scrlspeed: number;   // provided duration hint (seconds)
	direction: string;   // left, right, up, down
	behavior: string;
	type: string;        // TOP or BOTTOM
	isfreeze: boolean;
	font_folder: string;
	loadedFont?: string;
}
const loadedFontCache: Set<string> = new Set();

@Component({
	selector: 'app-scroller',
	templateUrl: './scroller.component.html',
	styleUrls: ['./scroller.component.scss']
})
export class ScrollerComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
	@Input() scrollers: ScrollerItem[] = [];
	@ViewChild('scrollWrapper') scrollWrapper!: ElementRef;
	@ViewChild('scrollTrack') scrollTrack!: ElementRef;
	public baseDuration: number = 20; // default fallback duration
	animationReady = false;
	private previousFontNames: string[] = [];

	ngOnInit() { }

	ngAfterViewInit() {
		// this.updateScrollSpeed();
	}

	ngOnChanges(changes: SimpleChanges) {
		if (changes['scrollers']) {
			this.checkFontChanges();
		}
	}


	private async checkFontChanges() {
		if (!this.scrollers || this.scrollers.length === 0) return;

		const currentFontNames = this.scrollers.map(s => s.fontname);

		// FIRST TIME → always load fonts
		if (this.previousFontNames.length === 0) {
			this.previousFontNames = [...currentFontNames];
			await this.loadScrollerFonts();
			this.updateScrollSpeed();
			return;
		}

		// CHECK IF ANY FONTNAME CHANGED
		const changed = currentFontNames.some((font, i) =>
			font !== this.previousFontNames[i]
		);

		if (changed) {
			console.log("Font name changed → Reloading fonts...");
			this.previousFontNames = [...currentFontNames];

			await this.loadScrollerFonts();
			this.updateScrollSpeed();
			return;
		}

		// ✔ FONT NOT CHANGED → Still re-apply loadedFont to trigger UI refresh
		this.scrollers.forEach(s => {
			s.loadedFont = s.font_folder;   // ⬅ RE-APPLY FONT ALWAYS
		});

	}



	private async loadScrollerFonts() {
		if (!this.scrollers || !this.scrollers.length) return;

		for (let s of this.scrollers) {
			const fontKey = `${s.font_folder}-${s.fontname}`;

			//  Already loaded → skip
			if (loadedFontCache.has(fontKey)) {
				s.loadedFont = s.font_folder;
				continue;
			}

			//  Invalid → skip
			if (!s.fontname || !s.font_folder) {
				s.loadedFont = 'sans-serif';
				continue;
			}

			//  Load font once
			try {
				await loadFontDynamically(s.font_folder, s.fontname);
				s.loadedFont = s.font_folder;

				// Mark as loaded
				loadedFontCache.add(fontKey);

				// console.log("Font loaded first time:", fontKey);

			} catch (err) {
				console.error("Font load error for:", s.font_folder, err);
				s.loadedFont = 'sans-serif';
			}
		}
	}



	private updateScrollSpeed() {
		this.animationReady = false;

		setTimeout(() => {
			const wrapper = this.scrollWrapper?.nativeElement as HTMLElement;
			const track = this.scrollTrack?.nativeElement as HTMLElement;
			if (!wrapper || !track || !this.scrollers.length) return;

			const s = this.scrollers[0];
			const direction = s.direction || 'left';

			// --- DOM measurements ---
			const wrapperWidth = wrapper.offsetWidth;
			const wrapperHeight = wrapper.offsetHeight;
			const trackWidth = track.scrollWidth;
			const trackHeight = track.scrollHeight;

			// --- Smooth speed mapping (balanced for WebOS hardware) ---
			const pxPerSec = 120; // smoother, hardware-friendly scale

			// --- Compute distance + duration ---
			let totalDistance: number, duration: number;
			if (direction === 'left' || direction === 'right') {
				totalDistance = wrapperWidth + trackWidth;
				duration = totalDistance / pxPerSec;
				track.style.setProperty('--start', `${wrapperWidth}px`);
				track.style.setProperty('--trackWidth', `${trackWidth}px`);
			} else {
				totalDistance = wrapperHeight + trackHeight;
				duration = totalDistance / pxPerSec;
				track.style.setProperty('--start', `${wrapperHeight}px`);
				track.style.setProperty('--trackHeight', `${trackHeight}px`);
			}

			// --- Apply styles ---
			track.style.animationDuration = `${duration.toFixed(2)}s`;
			track.style.animationTimingFunction = 'linear';
			track.style.willChange = 'transform';
			track.style.transform = 'translate3d(0, 0, 0)';

			// --- Start animation on next frame for stability ---
			requestAnimationFrame(() => {
				this.animationReady = true;
			});
		}, 300);
	}


	public calcPadding(scroller: ScrollerItem): string {
		const size = Number(scroller.fnsize) || 20;

		let vertical = size * 0.5;
		let horizontal = size * 2;

		if (size > 35) {
			vertical = size * 0.6;
		}

		return `${vertical}px ${horizontal}px`;
	}

	ngOnDestroy() { }
}
