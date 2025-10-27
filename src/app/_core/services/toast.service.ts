// src/app/services/toast.service.ts
import { Injectable } from '@angular/core';
import { ToastrService, IndividualConfig } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private options: Partial<IndividualConfig> = {
    timeOut: 1500,
    positionClass: 'toast-top-right',
    closeButton: false,
    progressBar: true
  };

  constructor(private toastr: ToastrService) { }

  success(message: string, title: string = 'Success') {
    this.toastr.success(message, title, this.options);
  }

  error(message: string, title: string = 'Error') {
    this.toastr.error(message, title, this.options);
  }

  info(message: string, title: string = 'Info') {
    this.toastr.info(message, title, this.options);
  }

  warning(message: string, title: string = 'Warning') {
    this.toastr.warning(message, title, this.options);
  }

  // Custom toast with overrides
  custom(message: string, title: string, config?: Partial<IndividualConfig>) {
    this.toastr.show(message, title, { ...this.options, ...config });
  }
}
