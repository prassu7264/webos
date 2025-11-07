
// import { Component, Input, OnInit, OnDestroy, AfterViewInit, OnChanges, SimpleChanges, ElementRef, ViewChild } from '@angular/core';


// export interface ScrollerItem {
// 	id: number;
// 	message: string;
// 	bgcolor: string;
// 	fncolor: string;
// 	fnsize: string;
// 	fontname: string;
// 	scrlspeed: number;   // provided duration hint (seconds)
// 	direction: string;   // left, right, up, down
// 	behavior: string;
// 	type: string;        // TOP or BOTTOM
// 	isfreeze: boolean;
// 	font_folder: string;
// 	logo?: string;
// }

// @Component({
// 	selector: 'app-scroller',
// 	templateUrl: './scroller.component.html',
// 	styleUrls: ['./scroller.component.scss']
// })
// export class ScrollerComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
// 	@Input() scrollers: ScrollerItem[] = [];
// 	@ViewChild('scrollWrapper') scrollWrapper!: ElementRef;
// 	@ViewChild('scrollTrack') scrollTrack!: ElementRef;

// 	public baseDuration: number = 20; // default fallback duration
// 	animationReady = false;

// 	ngOnInit() { }

// 	ngAfterViewInit() {
// 		this.updateScrollSpeed();
// 	}

// 	ngOnChanges(changes: SimpleChanges) {
// 		if (changes['scrollers']) {
// 			this.updateScrollSpeed();
// 		}
// 	}

// 	private updateScrollSpeed() {
// 		this.animationReady = false;

// 		setTimeout(() => {
// 			const wrapper = this.scrollWrapper?.nativeElement as HTMLElement;
// 			const track = this.scrollTrack?.nativeElement as HTMLElement;
// 			if (!wrapper || !track || !this.scrollers.length) return;

// 			const direction = this.scrollers[0].direction || 'left';
// 			const totalDuration = this.scrollers.reduce(
// 				(sum, s) => sum + (Number(s.scrlspeed) || 5),
// 				0
// 			);

// 			if (direction === 'left' || direction === 'right') {
// 				const wrapperWidth = wrapper.offsetWidth;
// 				const trackWidth = track.scrollWidth;
// 				this.baseDuration = totalDuration || (wrapperWidth + trackWidth) / 100;
// 				track.style.setProperty('--start', wrapperWidth + 'px');
// 				track.style.setProperty('--trackWidth', trackWidth + 'px');
// 			} else {
// 				const wrapperHeight = wrapper.offsetHeight;
// 				const trackHeight = track.scrollHeight;
// 				this.baseDuration = totalDuration || (wrapperHeight + trackHeight) / 100;
// 				track.style.setProperty('--start', wrapperHeight + 'px');
// 				track.style.setProperty('--trackHeight', trackHeight + 'px');
// 			}

// 			track.style.animationDuration = `${this.baseDuration}s`;

// 			requestAnimationFrame(() => {
// 				this.animationReady = true;
// 			});
// 		});
// 	}


// 	public calcPadding(scroller: ScrollerItem): string {
// 		const size = Number(scroller.fnsize) || 20;

// 		let vertical = size * 0.5;
// 		let horizontal = size * 2;

// 		if (size > 35) {
// 			vertical = size * 0.6;
// 		}

// 		return `${vertical}px ${horizontal}px`;
// 	}

// 	public getLogoSize(): string {
// 		if (!this.scrollers.length) return '70px';
// 		const size = Number(this.scrollers[0].fnsize) || 25;
// 		const height = size * 1.75; // adjust ratio if you want bigger/smaller logo
// 		return `${height}px`;
// 	}



// 	ngOnDestroy() { }
// }


import {Component,Input,OnInit,OnDestroy,AfterViewInit,OnChanges,SimpleChanges,ElementRef,ViewChild} from '@angular/core';

export interface ScrollerItem {
	id: number;
	message: string;
	bgcolor: string;
	fncolor: string;
	fnsize: string;
	fontname: string;
	scrlspeed: number;
	direction: string;
	behavior: string;
	type: string;
	isfreeze: boolean;
	font_folder: string;
	logo?: string;
}

@Component({
	selector: 'app-scroller',
	templateUrl: './scroller.component.html',
	styleUrls: ['./scroller.component.scss'],
})
export class ScrollerComponent
	implements OnInit, OnDestroy, AfterViewInit, OnChanges {
	@Input() scrollers: ScrollerItem[] = [];
	@ViewChild('scrollWrapper') scrollWrapper!: ElementRef;
	@ViewChild('scrollTrack') scrollTrack!: ElementRef;

	animationReady = false;
	currentIndex = 0;
	currentLogo: string | null = null;
	currentScroller!: ScrollerItem;
	private timer: any;

	ngOnInit() { }

	ngAfterViewInit() {
		this.startSequentialScrolling();
	}

	ngOnChanges(changes: SimpleChanges) {
		if (changes['scrollers'] && this.scrollers.length) {
			this.startSequentialScrolling();
		}
	}

	private startSequentialScrolling() {
		clearTimeout(this.timer);
		if (!this.scrollers.length) return;

		this.currentIndex = 0;
		this.playScroller(this.currentIndex);
	}

	private playScroller(index: number) {
		if (index >= this.scrollers.length) {
			// restart from first
			index = 0;
		}

		this.currentScroller = this.scrollers[index];
		this.currentLogo = this.currentScroller.logo || null;

		this.animationReady = false;

		setTimeout(() => {
			const wrapper = this.scrollWrapper?.nativeElement as HTMLElement;
			const track = this.scrollTrack?.nativeElement as HTMLElement;
			if (!wrapper || !track) return;

			const direction = this.currentScroller.direction || 'left';
			const speed = Number(this.currentScroller.scrlspeed) || 10;

			// Duration = speed in seconds
			track.style.animationDuration = `${speed}s`;

			if (direction === 'left' || direction === 'right') {
				const wrapperWidth = wrapper.offsetWidth;
				const trackWidth = track.scrollWidth;
				track.style.setProperty('--start', wrapperWidth + 'px');
				track.style.setProperty('--trackWidth', trackWidth + 'px');
			} else {
				const wrapperHeight = wrapper.offsetHeight;
				const trackHeight = track.scrollHeight;
				track.style.setProperty('--start', wrapperHeight + 'px');
				track.style.setProperty('--trackHeight', trackHeight + 'px');
			}

			requestAnimationFrame(() => (this.animationReady = true));

			// When this scroller finishes, trigger next one
			this.timer = setTimeout(() => {
				this.playScroller(index + 1);
			}, speed * 1000);
		});
	}

	public calcPadding(scroller: ScrollerItem): string {
		const size = Number(scroller.fnsize) || 20;
		let vertical = size * 0.5;
		let horizontal = size * 2;
		if (size > 35) vertical = size * 0.6;
		return `${vertical}px ${horizontal}px`;
	}

	public getLogoSize(): string {
		if (!this.currentScroller) return '70px';
		const size = Number(this.currentScroller.fnsize) || 25;
		return `${size * 1.75}px`;
	}

	ngOnDestroy() {
		clearTimeout(this.timer);
	}
}
