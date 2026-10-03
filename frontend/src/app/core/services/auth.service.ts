import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { User } from '../models';

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  data?: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'giftory_access_token';
  private readonly REFRESH_KEY = 'giftory_refresh_token';
  private readonly USER_KEY = 'giftory_user';

  currentUser = signal<User | null>(this.getStoredUser());
  accessToken = signal<string | null>(localStorage.getItem(this.TOKEN_KEY));
  
  isAuthenticated = computed(() => !!this.currentUser());
  isAdmin = computed(() => this.currentUser()?.role === 'ADMIN');
  loyaltyPoints = computed(() => this.currentUser()?.loyaltyPoints || 0);

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  login(credentialsOrEmail: any, password?: string): Observable<AuthResponse> {
    const payload = typeof credentialsOrEmail === 'string'
      ? { email: credentialsOrEmail, password }
      : credentialsOrEmail;

    return this.api.post<AuthResponse>('auth/login', payload).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  register(dataOrEmail: any, password?: string, fullName?: string, phone?: string): Observable<AuthResponse> {
    const payload = typeof dataOrEmail === 'string'
      ? { email: dataOrEmail, password, name: fullName, fullName, phone }
      : dataOrEmail;

    return this.api.post<AuthResponse>('auth/register', payload).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  logout(): void {
    const token = this.accessToken();
    if (token) {
      this.api.post('auth/logout', {}).subscribe({
        next: () => {},
        error: () => {}
      });
    }
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.accessToken.set(null);
    this.router.navigate(['/login']);
  }

  refreshProfile(): void {
    if (this.accessToken()) {
      this.api.get<User>('auth/me').subscribe({
        next: user => {
          this.currentUser.set(user);
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        },
        error: () => {
          this.logout();
        }
      });
    }
  }

  private handleAuthSuccess(res: any): void {
    const user = res.data?.user || res.user;
    const access = res.data?.accessToken || res.accessToken;
    const refresh = res.data?.refreshToken || res.refreshToken;

    if (access) localStorage.setItem(this.TOKEN_KEY, access);
    if (refresh) localStorage.setItem(this.REFRESH_KEY, refresh);
    if (user) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      this.currentUser.set(user);
    }
    if (access) this.accessToken.set(access);
  }

  private getStoredUser(): User | null {
    try {
      const stored = localStorage.getItem(this.USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
}
