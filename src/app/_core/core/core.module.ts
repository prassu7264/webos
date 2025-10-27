import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { YouTubePlayerModule } from '@angular/youtube-player';
import { PdfViewerComponent } from '../cell-renders/pdf-viewer/pdf-viewer.component';
import { GridsterModule } from 'angular-gridster2';
import { YtplayerComponent } from '../cell-renders/ytplayer/ytplayer.component';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { YtubeplayerComponent } from '../cell-renders/ytubeplayer/ytubeplayer.component';
import { MenuComponent } from '../_utils/menu/menu.component';
import { MatMaterialModule } from '../mat-material/mat-material.module';
import { ConnectionServiceModule } from 'ng-connection-service';

@NgModule({
  declarations: [
    PdfViewerComponent,
    YtplayerComponent,
    YtubeplayerComponent,
    MenuComponent
  ],
  imports: [
    CommonModule,
    YouTubePlayerModule,
    GridsterModule,
    NgxExtendedPdfViewerModule,
    MatMaterialModule,
    ConnectionServiceModule
  ],
  exports: [
    YouTubePlayerModule,
    PdfViewerComponent,
    GridsterModule,
    YtplayerComponent,
    NgxExtendedPdfViewerModule,
    YtubeplayerComponent,
    MenuComponent,
    MatMaterialModule
  ]
})
export class CoreModule { }
