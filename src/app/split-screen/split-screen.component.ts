import { Component, OnInit, OnDestroy } from '@angular/core';
import { GridsterConfig, GridsterItem } from 'angular-gridster2';
import { AuthService } from '../_core/services/auth.service';
import { DeviceInfoService } from '../_core/services/device-info.service';
import { interval, Subscription, tap } from 'rxjs';
import { Router } from '@angular/router';
// import Swal from 'sweetalert2';
import { ConnectionService, ConnectionState } from 'ng-connection-service';
declare var webOS: any;
@Component({
  selector: 'app-split-screen',
  templateUrl: './split-screen.component.html',
  styleUrls: ['./split-screen.component.scss']
})
export class SplitScreenComponent implements OnInit, OnDestroy {
  status: string = 'ONLINE';
  currentState!: ConnectionState;
  subscription = new Subscription();
  options: GridsterConfig;
  splitScreen: any[] = [];
  zoneinfo: GridsterItem[] | any[] = [];
  device: any;
  intervalSub?: Subscription;
  currentIndex = 0;
  private autoplayTimer?: any;
  private redirecting = false;
  scrollers: any[] = [];
  topScrollers: any[] = [];
  bottomScrollers: any[] = [];

  constructor(
    private authService: AuthService,
    private deviceInfoService: DeviceInfoService,
    private router: Router,
    private connectionService: ConnectionService
  ) {
    this.options = {
      draggable: { enabled: false },
      resizable: { enabled: false },
      pushItems: true,
      swap: false,
      gridType: 'fit',
      margin: 0,
      outerMargin: false,
    };

    this.device = JSON.parse(sessionStorage.getItem('device') || '{}');
    if (this.device?.username && this.device?.password) this.signin();
  }

  ngOnInit(): void {
    this.device.isVertical = this.device?.orientation?.includes("9:16");

    // Device UID subscription
    this.deviceInfoService.deviceUID$.subscribe(uid => {
      if (uid) {
        this.device.androidid = uid;
        this.loadMediaFiles();
      }
    });

    // Poll every 5s
    this.intervalSub = interval(5000).subscribe(() => {
      if (this.device.androidid) {
        this.isExistedDevice(this.device.androidid);
        this.checkForUpdates();
      }
    });

    history.pushState(null, '', window.location.href);

    // Override back navigation
    // window.onpopstate = () => {
    //   history.go(1);
    //   this.exitApp();
    // };

    this.subscription.add(
      this.connectionService.monitor().pipe(
        tap((newState: ConnectionState) => {
          this.currentState = newState;
          console.log(this.currentState);

          if (this.currentState.hasNetworkConnection) {
            if (this.status == 'OFFLINE') {
              this.status = 'ONLINE';
              this.ngOnInit();
            }

          } else {
            this.status = 'OFFLINE';
          }
        })
      ).subscribe()
    );
  }
  // exitApp() {
  //   if (typeof webOS !== "undefined" && webOS.platformBack) {
  //     // Official way: Tell webOS to exit
  //     webOS.platformBack();
  //     console.log(webOS);

  //   } else {
  //     Swal.fire({
  //       title: "Are you sure?",
  //       text: "You do you want to exit application?",
  //       icon: "warning",
  //       showCancelButton: true,
  //       confirmButtonColor: "#3085d6",
  //       cancelButtonColor: "#d33",
  //       confirmButtonText: "Yes, Exit app!"
  //     }).then((result) => {
  //       if (result.isConfirmed) {
  //         window.close();
  //       }
  //     });

  //     setTimeout(() => {
  //       Swal.close();
  //     }, 10000);

  //   }
  // }
  ngOnDestroy(): void {
    this.intervalSub?.unsubscribe();
    clearTimeout(this.autoplayTimer);
    this.subscription.unsubscribe();
  }

  private signin() {
    const payload = { username: this.device.username, password: this.device.password };
    this.authService.signin(payload).subscribe({
      next: (res: any) => this.authService.saveToken(res?.accessToken),
      error: (err) => console.error("Signin failed:", err)
    });
  }

  private isExistedDevice(deviceUID: string) {
    this.authService.isExistedDevice(deviceUID).subscribe((res: any) => {
      const { client_status, device_status, isexpired, orientation } = res;
      if (res?.status !== "success" || !client_status || !device_status || isexpired) {
        if (!this.redirecting) {
          this.redirecting = true;
          sessionStorage.clear();
          sessionStorage.setItem("isVideoPlayed", "true");
          this.router.navigate(['/login'], { state: { from: 'player', isVideoPlayed: false } });
        }
      }
      else if (this.device.orientation != orientation) {
        let uid = this.device.androidid
        this.device = res;
        this.device.androidid = uid;
        this.device.isVertical = this.device?.orientation?.includes("9:16");
      }
    });
  }

  private loadMediaFiles() {
    this.authService.getMediafiles(this.device).subscribe((res: any) => {
      this.splitScreen = res?.layout_list ?? [];
      // update all scrollers
      this.scrollers = res?.scrollerList || res?.scrollermessage || res?.tickerList || [];

      // split by type every time we fetch new scrollers
      this.topScrollers = this.scrollers.filter(s => s.type === 'TOP');
      this.bottomScrollers = this.scrollers.filter(s => s.type === 'BOTTOM');
      this.currentIndex = 0;
      this.showCurrentSlide();
    });
  }

  private checkForUpdates() {
    console.log(this.device);
    this.authService.getMediafiles(this.device).subscribe((res: any) => {
      const newLayout = res?.layout_list ?? [];
      const newScrollers = res?.scrollerList || res?.scrollermessage || res?.tickerList || [];
      //  Update scrollers if changed
      if (JSON.stringify(this.scrollers) !== JSON.stringify(newScrollers)) {
        this.scrollers = newScrollers;
        this.topScrollers = this.scrollers.filter(s => s.type === 'TOP');
        this.bottomScrollers = this.scrollers.filter(s => s.type === 'BOTTOM');
      }
      if (JSON.stringify(this.splitScreen) !== JSON.stringify(newLayout)) {
        this.splitScreen = newLayout;
        this.currentIndex = 0;
        this.showCurrentSlide();
      }
      // this.getNetworkInfo();
    });
  }

  private showCurrentSlide() {
    clearTimeout(this.autoplayTimer);
    this.zoneinfo = [];
    if (!this.splitScreen?.length) return;
    this.zoneinfo = this.splitScreen[this.currentIndex]?.zonelist || [];
    const layout_time = this.splitScreen[this.currentIndex]?.layout_duration ?? 10;
    // console.log(this.splitScreen  )
    if (this.splitScreen.length > 1) {
      this.autoplayTimer = setTimeout(() => this.nextSlideAndShow(), layout_time * 1000);

    }

  }

  private nextSlideAndShow() {
    clearTimeout(this.autoplayTimer);
    if (!this.splitScreen?.length) return;

    this.currentIndex = (this.currentIndex + 1) % this.splitScreen.length;
    this.showCurrentSlide();
  }
  getNetworkInfo() {
    this.authService.getNetworkInfo(this.device).subscribe((res: any) => {
      console.log(res);
    });
  }
}
