import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';


@Injectable({ providedIn: 'root' })
export class LoggerService {

  private readonly appTag = '📺 IQ-TV';

  log(method: string, message: string, data?: any) {
    if (!environment.production) {
      console.log(this.format('LOG', method, message), data ?? '');
    }
  }

  info(method: string, message: string, data?: any) {
    if (!environment.production) {
      console.info(this.format('INFO', method, message), data ?? '');
    }
  }

  warn(method: string, message: string, data?: any) {
    console.warn(this.format('WARN', method, message), data ?? '');
  }

  error(method: string, message: string, error?: any) {
    console.error(this.format('ERROR', method, message), error ?? '');
  }

  private format(level: string, method: string, message: string): string {
    const time = new Date().toISOString();
    return `${this.appTag} [${level}] ${time} :: ${method} → ${message}`;
  }
}
