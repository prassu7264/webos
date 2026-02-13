import { HttpBackend, HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { of, interval } from 'rxjs';
import { catchError, map, startWith, switchMap, tap } from 'rxjs/operators';
import { clienturl } from 'src/app/api-base';
import { environment } from '../../../environments/environment';

const SERVER_URL: any = clienturl.SERVER_URL();
const BASE_URL: any = clienturl.BASE_URL();
const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable({ providedIn: 'root' })
export class LoggerService {
  private readonly appTag = '📺 IQ-TV';
  private readonly loggerPollMs = 4000;
  private readonly http: HttpClient;
  private loggerMode: 'production' | 'development' = environment.production ? 'development' : 'production';
  private baseUrl = this.normalizeBaseUrl(BASE_URL);

  constructor(httpBackend: HttpBackend) {
    this.http = new HttpClient(httpBackend);
    this.startLoggerModePolling();
  }

  private shouldWrite(): boolean {
    if (!environment.production) {
      return true;
    }
    return this.loggerMode === 'production';
  }

  log(method: string, message: string, data?: any) {
    if (this.shouldWrite()) {
      console.log(this.format('LOG', method, message), data ?? '');
    }
  }

  info(method: string, message: string, data?: any) {
    if (this.shouldWrite()) {
      console.info(this.format('INFO', method, message), data ?? '');
    }
  }

  warn(method: string, message: string, data?: any) {
    if (this.shouldWrite()) {
      console.warn(this.format('WARN', method, message), data ?? '');
    }
  }

  error(method: string, message: string, error?: any) {
    if (this.shouldWrite()) {
      console.error(this.format('ERROR', method, message), error ?? '');
    }
  }

  private startLoggerModePolling(): void {
    interval(this.loggerPollMs).pipe(
      startWith(0),
      switchMap(() =>
        this.http.get(`${this.baseUrl}api/v1/logger`, httpOptions).pipe(
          map((res: any) => this.extractLoggerMode(res)),
          catchError(() => of<('production' | 'development' | null)>(null))
        )
      ),
      tap((mode: 'production' | 'development' | null) => {
        if (mode) {
          this.loggerMode = mode;
        }
      })
    ).subscribe();
  }

  private extractLoggerMode(response: any): 'production' | 'development' | null {
    const raw = typeof response === 'string' ? response : response?.logger;
    const mode = String(raw ?? '').trim().toLowerCase();

    if (mode === 'production' || mode === 'development') {
      return mode;
    }
    return null;
  }

  private normalizeBaseUrl(url: any): string {
    const parsed = String(url ?? '').trim();
    const fallback = String(BASE_URL ?? '').trim();
    const value = parsed || fallback;
    return value.endsWith('/') ? value : `${value}/`;
  }

  private format(level: string, method: string, message: string): string {
    const time = new Date().toISOString();
    return `${this.appTag} [${level}] ${time} :: ${method} → ${message}`;
  }
}
