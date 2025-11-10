import { Component, Input, OnInit, OnDestroy, AfterViewInit, OnChanges, SimpleChanges, ElementRef, ViewChild } from '@angular/core';

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
}

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

	ngOnInit() { }

	ngAfterViewInit() {
		// this.updateScrollSpeed();
	}

	ngOnChanges(changes: SimpleChanges) {
		if (changes['scrollers']) {
			this.updateScrollSpeed();
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
			const baseSpeed = Number(s.scrlspeed) || 10;

			// --- DOM measurements ---
			const wrapperWidth = wrapper.offsetWidth;
			const wrapperHeight = wrapper.offsetHeight;
			const trackWidth = track.scrollWidth;
			const trackHeight = track.scrollHeight;

			// --- Smooth speed mapping (balanced for WebOS hardware) ---
			// scrlspeed from API (5 = slow, 10 = medium, 15 = fast)
			const pxPerSec = 140; // smoother, hardware-friendly scale

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

			// --- Debug info for your logs ---
			console.log('Scroller config:', {
				direction,
				baseSpeed,
				pxPerSec,
				duration,
				totalDistance,
				wrapperWidth,
				trackWidth
			});

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
