import { Injectable } from '@angular/core';
import {HttpRequest,HttpHandler,HttpEvent,HttpInterceptor,HTTP_INTERCEPTORS,HttpErrorResponse} from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';

const TOKEN_HEADER_KEY = 'Authorization';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private auth: AuthService,
    private router: Router
  ) { }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    let authReq = request;

    // Get token from storage
    const token = this.auth.getToken();

    // Attach token if exists
    if (token) {
      authReq = request.clone({
        headers: request.headers.set(TOKEN_HEADER_KEY, `Bearer ${token}`)
      });
    }

    return next.handle(authReq).pipe(
      catchError((error) => {
        let handled = false;

        if (error instanceof HttpErrorResponse) {
          switch (error.status) {
            case 401:
              this.router.navigate(['/login']);
              handled = true;
              break;
            case 403:
              this.router.navigate(['/login']);
              handled = true;
              break;
          }
        }

        return handled ? of(error) : throwError(() => error);
      })
    );
  }
}

// Provide in app.module.ts
export const authInterceptorProviders = [
  { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
];
