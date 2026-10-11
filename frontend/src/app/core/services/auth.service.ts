import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { Observable, tap, map, catchError, throwError, finalize, shareReplay } from 'rxjs';
import { User } from '../models';
import { environment } from '../../../environments/environment';
export interface AuthResponse { user: User; accessToken: string; refreshToken: string; data?: AuthResponse; }
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'giftory_access_token';
  private readonly REFRESH_KEY = 'giftory_refresh_token';
  private readonly USER_KEY = 'giftory_user';
  private http: HttpClient;
  private refreshRequest?: Observable<AuthResponse>;
  private sessionGeneration = 0;
  currentUser = signal<User | null>(this.getStoredUser());
  accessToken = signal<string | null>(localStorage.getItem(this.TOKEN_KEY));
  isAuthenticated = computed(() => !!this.currentUser() && !!this.accessToken());
  isAdmin = computed(() => this.isAuthenticated() && this.currentUser()?.role === 'ADMIN');
  loyaltyPoints = computed(() => this.currentUser()?.loyaltyPoints || 0);
  constructor(backend: HttpBackend, private router: Router) {
    // Authentication requests bypass the interceptor to avoid recursive refresh requests.
    this.http = new HttpClient(backend);
    window.addEventListener('storage', event => {
      if (event.key === this.TOKEN_KEY || event.key === this.USER_KEY || event.key === null) {
        this.sessionGeneration++;
        this.accessToken.set(localStorage.getItem(this.TOKEN_KEY)); this.currentUser.set(this.getStoredUser());
      }
    });
  }
  private post<T>(path: string, body: unknown) {
    return this.http.post<{ data: T }>(`${environment.apiUrl}/auth/${path}`, body).pipe(map(res => res.data));
  }
  login(value: any, password?: string): Observable<AuthResponse> {
    const payload = typeof value === 'string' ? { email: value, password } : value;
    const generation = ++this.sessionGeneration;
    return this.post<AuthResponse>('login', { ...payload, email: payload.email.trim().toLowerCase() }).pipe(tap(res => { if (generation === this.sessionGeneration) this.saveSession(res); }));
  }
  register(value: any, password?: string, name?: string, phone?: string): Observable<AuthResponse> {
    const payload = typeof value === 'string' ? { email: value, password, name, phone } : value;
    const generation = ++this.sessionGeneration;
    return this.post<AuthResponse>('register', { ...payload, email: payload.email.trim().toLowerCase() }).pipe(tap(res => { if (generation === this.sessionGeneration) this.saveSession(res); }));
  }
  refreshSession(): Observable<AuthResponse> {
    if (this.refreshRequest) return this.refreshRequest;
    const refreshToken = localStorage.getItem(this.REFRESH_KEY);
    const generation = this.sessionGeneration;
    if (!refreshToken) return throwError(() => ({ status: 401 }));
    this.refreshRequest = this.post<AuthResponse>('refresh', { refreshToken }).pipe(
      tap(res => {
        if (generation !== this.sessionGeneration) throw { status: 401 };
        this.saveSession(res);
      }),
      catchError(error => {
        if ((error.status === 401 || error.status === 403) && generation === this.sessionGeneration) this.clearSession();
        return throwError(() => error);
      }),
      finalize(() => { this.refreshRequest = undefined; }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.refreshRequest;
  }
  refreshProfile(): void {
    const token = this.accessToken(); const generation = this.sessionGeneration;
    if (!token) return;
    this.http.get<{ data: User }>(`${environment.apiUrl}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }).subscribe({
      next: res => { if (generation === this.sessionGeneration) { this.currentUser.set(res.data); localStorage.setItem(this.USER_KEY, JSON.stringify(res.data)); } },
      error: err => { if (generation === this.sessionGeneration && err.status === 401) this.refreshSession().subscribe({ error: () => {} }); },
    });
  }
  clearSession(): void {
    this.sessionGeneration++;
    localStorage.removeItem(this.TOKEN_KEY); localStorage.removeItem(this.REFRESH_KEY); localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null); this.accessToken.set(null);
  }
  logout(): void {
    const token = this.accessToken();
    const refreshToken = localStorage.getItem(this.REFRESH_KEY);
    if (token || refreshToken) this.http.post(`${environment.apiUrl}/auth/logout`, { refreshToken }, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).subscribe({ error: () => {} });
    this.clearSession(); void this.router.navigate(['/login']);
  }
  forgotPassword(email: string) { return this.post<{ message: string }>('forgot-password', { email: email.trim().toLowerCase() }); }
  resetPassword(token: string, password: string) { return this.post<{ message: string }>('reset-password', { token, password }); }
  private saveSession(res: AuthResponse) {
    if (!res?.user?._id || !res.accessToken || !res.refreshToken) throw new Error('Phản hồi đăng nhập không hợp lệ');
    localStorage.setItem(this.TOKEN_KEY, res.accessToken); localStorage.setItem(this.REFRESH_KEY, res.refreshToken); localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
    this.currentUser.set(res.user); this.accessToken.set(res.accessToken);
  }
  private getStoredUser(): User | null {
    try { const user = JSON.parse(localStorage.getItem(this.USER_KEY) || 'null'); return user?._id && user?.email ? user : null; } catch { return null; }
  }
}
