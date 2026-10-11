import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService); const router = inject(Router);
  return auth.isAuthenticated() || router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService); const router = inject(Router);
  if (auth.isAuthenticated()) return auth.isAdmin() || router.createUrlTree(['/']);
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url, error: 'admin_only' } });
};
