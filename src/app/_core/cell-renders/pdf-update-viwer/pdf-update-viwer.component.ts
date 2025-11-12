import {AfterViewInit,Component,ElementRef,OnDestroy,ViewChild,} from '@angular/core';

declare var pdfjsLib: any; // ✅ use global pdfjsLib from index.html

@Component({
  selector: 'app-pdf-update-viwer',
  templateUrl: './pdf-update-viwer.component.html',
  styleUrls: ['./pdf-update-viwer.component.scss']
})
export class PdfUpdateViwerComponent {
  @ViewChild('pdfCanvas', { static: true })
  pdfCanvas!: ElementRef<HTMLCanvasElement>;

  pdfDoc: any = null;
  pageNum: number = 1;
  totalPages: number = 0;
  pageIsRendering = false;
  pageNumIsPending: number | null = null;

  private autoSwitchInterval: any;
  readonly autoSwitchDelay = 15000; // 5 seconds per page

  ngAfterViewInit() {
    // ✅ Set worker source (MUST match your index.html script version)
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

    // ✅ Start PDF loading
    const pdfUrl =
      'https://ds.iqtv.in/iqsignage/4/3452/IQ_WORLD_38646203.pdf';
    this.loadPDF(pdfUrl);
  }

  ngOnDestroy() {
    this.stopAutoSwitch();
  }

  async loadPDF(url: string) {
    try {
      this.pdfDoc = await pdfjsLib.getDocument(url).promise;
      this.totalPages = this.pdfDoc.numPages;
      await this.renderPage(this.pageNum);
      this.startAutoSwitch();
    } catch (error) {
      console.error('❌ Error loading PDF:', error);
    }
  }

  private async renderPage(num: number) {
    this.pageIsRendering = true;
    const page = await this.pdfDoc.getPage(num);

    const scale = this.getScaleForFullscreen(page);
    const viewport = page.getViewport({ scale });

    const canvas = this.pdfCanvas.nativeElement;
    const ctx = canvas.getContext('2d')!;

    // ✅ Super high-resolution 4K scaling
    const outputScale = window.devicePixelRatio * 2 || 2;

    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    const transform =
      outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

    const renderCtx = {
      canvasContext: ctx,
      transform,
      viewport,
    };

    await page.render(renderCtx).promise;
    this.pageIsRendering = false;

    if (this.pageNumIsPending !== null) {
      const next = this.pageNumIsPending;
      this.pageNumIsPending = null;
      this.renderPage(next);
    }
  }

  private getScaleForFullscreen(page: any): number {
    const viewport = page.getViewport({ scale: 1 });
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const scaleX = screenWidth / viewport.width;
    const scaleY = screenHeight / viewport.height;

    // ✅ Double scaling for crisp 4K quality
    return Math.min(scaleX, scaleY) * 2.2;
  }

  private queueRenderPage(num: number) {
    if (this.pageIsRendering) {
      this.pageNumIsPending = num;
    } else {
      this.renderPage(num);
    }
  }

  nextPage() {
    this.stopAutoSwitch();
    if (this.pageNum >= this.totalPages) {
      this.pageNum = 1;
    } else {
      this.pageNum++;
    }
    this.queueRenderPage(this.pageNum);
  }

  prevPage() {
    this.stopAutoSwitch();
    if (this.pageNum > 1) {
      this.pageNum--;
      this.queueRenderPage(this.pageNum);
    }
  }

  private startAutoSwitch() {
    if (this.autoSwitchInterval) return;
    this.autoSwitchInterval = setInterval(() => {
      if (this.pageIsRendering) return;
      this.pageNum =
        this.pageNum < this.totalPages ? this.pageNum + 1 : 1;
      this.queueRenderPage(this.pageNum);
    }, this.autoSwitchDelay);
  }

  private stopAutoSwitch() {
    if (this.autoSwitchInterval) {
      clearInterval(this.autoSwitchInterval);
      this.autoSwitchInterval = null;
    }
  }

}
