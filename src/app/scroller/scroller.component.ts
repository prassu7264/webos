
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

			const currentScroller = this.scrollers[0]; // use first active scroller
			const direction = currentScroller.direction || 'left';

			// --- Centralized scroller speed logic ---
			const baseSpeed = Number(currentScroller.scrlspeed) || 10; // from API
			const wrapperWidth = wrapper.offsetWidth;
			const trackWidth = track.scrollWidth;

			console.log(wrapperWidth + " wrapperWidth")
			console.log(trackWidth + " trackWidth")

			// Determine general speed category
			let speedFactor;
			if (baseSpeed == 5) speedFactor = 0.6;      // low
			else if (baseSpeed == 10) speedFactor = 1.0; // medium
			else speedFactor = 1.6;                      // high

			
			// Base pixel speed (px/sec)
			// const pixelSpeed = 150 * speedFactor * (1 + Math.log10(lengthFactor + 1) * 0.3);
			const pixelSpeed = 155;
			if(baseSpeed == 5) console.log(pixelSpeed + " Low pixelSpeed");
			else if(baseSpeed == 10 ) console.log(pixelSpeed + " Medium pixelSpeed");
			else console.log(pixelSpeed + " High pixelSpeed");
			

			// Calculate total distance & duration
			let totalDistance: number;
			let duration: number;

			if (direction === 'left' || direction === 'right') {
				totalDistance = wrapperWidth + trackWidth;
				duration = totalDistance / pixelSpeed;
				track.style.setProperty('--start', wrapperWidth + 'px');
				track.style.setProperty('--trackWidth', trackWidth + 'px');
			} else {
				const wrapperHeight = wrapper.offsetHeight;
				const trackHeight = track.scrollHeight;
				totalDistance = wrapperHeight + trackHeight;
				duration = totalDistance / pixelSpeed;
				track.style.setProperty('--start', wrapperHeight + 'px');
				track.style.setProperty('--trackHeight', trackHeight + 'px');
			}

			// Set animation duration dynamically
			this.baseDuration = duration;
			track.style.animationDuration = `${this.baseDuration}s`;

			requestAnimationFrame(() => {
				this.animationReady = true;
			});
		});
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
