import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { PdfLoadedEvent } from 'ngx-extended-pdf-viewer';

@Component({
	selector: 'app-pdf-viewer',
	templateUrl: './pdf-viewer.component.html',
	styleUrls: ['./pdf-viewer.component.scss']
})
export class PdfViewerComponent implements OnChanges, OnDestroy {
	@Input() url: any;
	pdfUrl!: string | any;
	@Output() pdfEnded = new EventEmitter<{ success: boolean; message?: string }>();
	@Input() loop: boolean = false
	@Input() isScroll: boolean = true
	currentPage = 1;
	totalPages = 0;
	interval: any;

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['url']) {
			// cleanup before loading a new PDF
			this.cleanup();
			this.currentPage = 1;
			this.totalPages = 0;

			// reload PDF properly
			this.pdfUrl = null;
			setTimeout(() => (this.pdfUrl = this.url), 5);
		}
	}

	afterLoadComplete(pdf: PdfLoadedEvent) {
		// reset slideshow for new PDF
		this.cleanup();
		this.currentPage = 1;
		this.totalPages = pdf.pagesCount;

		// console.log(`📄 Loaded PDF with ${this.totalPages} pages`);

		if (this.totalPages > 0) {
			if (this.isScroll) {
				console.log("isScroll Works!")
				setTimeout(() => this.startSlideShow(), 1000);
			}
		} else {
			console.error("Could not detect pages in PDF");
			this.pdfEnded.emit({ success: false, message: "Could not detect pages in PDF" });
		}
	}

	startSlideShow() {
		this.interval = setInterval(() => {
			if (this.currentPage < this.totalPages) {
				this.currentPage++;
				console.log(`➡️ Page ${this.currentPage}/${this.totalPages}`);
			} else if (this.loop) {
				this.currentPage = 1
			} else {
				this.cleanup();
				this.pdfEnded.emit({ success: true, message: "Slideshow completed" });
			}
		}, 10000); // 3 sec per page (change as needed)
	}

	ngOnDestroy(): void {
		this.cleanup();
	}

	private cleanup() {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
		}
	}
}
