import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { SplitScreenComponent } from './split-screen/split-screen.component';
import { OfflinePlayerComponent } from './offline-player/offline-player.component';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, data: { isLoginPage: true } },
  { path: 'player', component: SplitScreenComponent },
  { path: 'offline-player', component: OfflinePlayerComponent },
  { path: "**", component: LoginComponent },
];

@NgModule({
  // imports: [RouterModule.forRoot(routes)],
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
