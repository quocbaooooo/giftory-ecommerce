import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService); const router = inject(Router);
  // Never send the Giftory token to external upload/image services.
  if (!req.url.startsWith(`${environment.apiUrl}/`)) return next(req);
  // Public catalog reads do not need a bearer token (or a cross-origin preflight).
  const path = req.url.slice(environment.apiUrl.length).split('?')[0];
  if (req.method === 'GET' && (/^\/products(?:\/|$)/.test(path)
    || path === '/categories' || path === '/categories/display-settings')) return next(req);
  const token = auth.accessToken();
  const authorized = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(authorized).pipe(catchError(error => {
    if (error.status !== 401 || !token || req.url.includes('/auth/')) return throwError(() => error);
    if (auth.accessToken() && auth.accessToken() !== token) return next(req.clone({ setHeaders: { Authorization: `Bearer ${auth.accessToken()}` } }));
    return auth.refreshSession().pipe(
      catchError(refreshError => {
        if ((refreshError.status === 401 || refreshError.status === 403) && (!auth.accessToken() || auth.accessToken() === token)) {
          auth.clearSession();
          void router.navigate(['/login'], { queryParams: { returnUrl: router.url, reason: 'expired' } });
        }
        return throwError(() => refreshError);
      }),
      switchMap(session => next(req.clone({ setHeaders: { Authorization: `Bearer ${session.accessToken}` } }))),
    );
  }));
};
