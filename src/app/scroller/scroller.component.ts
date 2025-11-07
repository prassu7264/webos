
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
		this.updateScrollSpeed();
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

			const direction = this.scrollers[0].direction || 'left';
			const totalDuration = this.scrollers.reduce(
				(sum, s) => sum + (Number(s.scrlspeed) || 5),
				0
			);

			if (direction === 'left' || direction === 'right') {
				const wrapperWidth = wrapper.offsetWidth;
				const trackWidth = track.scrollWidth;
				this.baseDuration = totalDuration || (wrapperWidth + trackWidth) / 100;
				track.style.setProperty('--start', wrapperWidth + 'px');
				track.style.setProperty('--trackWidth', trackWidth + 'px');
			} else {
				const wrapperHeight = wrapper.offsetHeight;
				const trackHeight = track.scrollHeight;
				this.baseDuration = totalDuration || (wrapperHeight + trackHeight) / 100;
				track.style.setProperty('--start', wrapperHeight + 'px');
				track.style.setProperty('--trackHeight', trackHeight + 'px');
			}

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
