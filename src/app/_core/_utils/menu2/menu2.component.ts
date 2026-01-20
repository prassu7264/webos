import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { clienturl } from 'src/app/api-base';
import { UsermanualComponent } from '../usermanual/usermanual.component';


declare const webOS: any;


@Component({
	selector: 'app-menu2',
	templateUrl: './menu2.component.html',
	styleUrls: ['./menu2.component.scss']
})
export class Menu2Component implements OnInit {
	@ViewChild('deviceDetails', { static: true }) deviceDetails!: TemplateRef<any>;
	@ViewChild('logoutStep1', { static: true }) logoutStep1!: TemplateRef<any>;
	@ViewChild('logoutStep2', { static: true }) logoutStep2!: TemplateRef<any>;

	deviceInfo: any = {};
	version = clienturl.CURRENT_VERSION();
	dialogRef: any;

	radioOptions = [
		{ id: 1, title: 'Device Details', icon: './assets/images/drawable/info.png', type: 'device' },
		{ id: 2, title: 'User Manual', icon: './assets/images/drawable/information.png', type: 'usermanual' },
		{ id: 3, title: 'Mode Configuration', icon: './assets/images/drawable/cogwheel.png', type: 'mode' },
		// { id: 4, title: 'OTA Upgrade', icon: './assets/images/drawable/uparrow.png', type: 'ota' },
		// { id: 5, title: 'Network Settings', icon: './assets/images/drawable/networksettingslogo.png', type: 'network' },
		{ id: 6, title: 'Logout', icon: './assets/images/logout.png', type: 'logout' }
	];

	constructor(private dialog: MatDialog, private authService: AuthService, private toastService: ToastService) {
		this.deviceInfo = JSON.parse(sessionStorage.getItem('device') || '{}');
	}

	ngOnInit(): void { }

	openOption(option: any) {
		if (option.type === 'device') {
			this.dialog.open(this.deviceDetails, { width: '450px' });
		} else if (option.type === 'logout') {
			this.openLogoutDialog();
		} 
		// else if (option.type === 'network') {
		// 	this.openNetworkSettingsWebOS();
		// } 
		else if (option.type === 'usermanual') {
			this.openUserManualPopup();
			return;
		}
		else {
			this.toastService.info(`${option.title} coming soon!`);
		}
	}

	openUserManualPopup() {

		this.dialog.open(UsermanualComponent, {
			width: '60%',
			height: '100%',
			panelClass: 'usermanual-dialog',
			disableClose: true, // BACK handled manually
			hasBackdrop: true
		});
	}


	openNetworkSettingsWebOS() {
		try {
			if (typeof webOS !== 'undefined' && webOS.service) {
				webOS.service.request(
					'luna://com.webos.applicationManager',
					{
						method: 'launch',
						parameters: {
							id: 'com.webos.app.settings',
							params: {
								category: 'network'
							}
						}
					}
				);
				this.toastService.info('Opening Network Settings');
			} else {
				this.toastService.info('Network settings available only on LG webOS TV');
			}
		} catch (e) {
			this.toastService.error('Unable to open network settings');
		}
	}

	openLogoutDialog(): void {
		if (this.dialogRef) return;

		// Step 1: Confirm logout
		this.dialogRef = this.dialog.open(this.logoutStep1, { width: '400px' });

		this.dialogRef.afterClosed().subscribe((firstResult: any) => {
			this.dialogRef = null;

			if (firstResult === 'yes') {
				// Step 2: Save UID or not
				this.dialogRef = this.dialog.open(this.logoutStep2, { width: '400px' });

				this.dialogRef.afterClosed().subscribe((secondResult: any) => {
					this.dialogRef = null;

					if (secondResult === 'yes' || secondResult === 'no') {
						const v = { isConfirmed: secondResult === 'yes', isDenied: secondResult === 'no' };

						this.authService.logout(v).subscribe((res: any) => {
							this.toastService.success(res?.message || "Logged out successfully!!");
							this.dialog.closeAll();
						});
					}
				});
			}
		});
	}
}
