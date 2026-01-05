import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-usermanual',
  templateUrl: './usermanual.component.html',
  styleUrls: ['./usermanual.component.scss']
})
export class UsermanualComponent {

  pdfUrl!: SafeResourceUrl;

  constructor(
    private dialogRef: MatDialogRef<UsermanualComponent>,
    private sanitizer: DomSanitizer
  ) {
    this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://ds.iqtv.in/docs/usermanual.v1.0.pdf#toolbar=0&navpanes=0&scrollbar=0&zoom=page-fit&pagemode=none'
    );
  }

  close() {
    this.dialogRef.close();
  }
}
