import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatMaterialModule } from './_core/mat-material/mat-material.module';
import { RemoteControlDirective } from './_core/directives/remote-control.directive';
import { HttpClientModule } from '@angular/common/http';
import { ToastrModule } from 'ngx-toastr';
import { CoreModule } from './_core/core/core.module';
import { SplitScreenComponent } from './split-screen/split-screen.component';
import { ContentPlayerComponent } from './content-player/content-player.component';
import { ScrollerComponent } from './scroller/scroller.component';
import { CommonModule } from '@angular/common';
import { Menu2Component } from './_core/_utils/menu2/menu2.component';
import { OfflinePlayerComponent } from './offline-player/offline-player.component';
import { UsbReaderComponent } from './usb-reader/usb-reader.component';



@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RemoteControlDirective,
    SplitScreenComponent,
    ContentPlayerComponent,
    ScrollerComponent,
    Menu2Component,
    OfflinePlayerComponent,
    UsbReaderComponent
  
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatMaterialModule,
    HttpClientModule,
    CommonModule,
    ToastrModule.forRoot({
      timeOut: 3000,
      positionClass: 'toast-top-right',
      preventDuplicates: true
    }),
    CoreModule,
    
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
