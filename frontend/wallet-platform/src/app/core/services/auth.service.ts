import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  RegisterRequest, LoginRequest, AuthTokens,
  RefreshTokenRequest, CurrentUser, ChangePasswordRequest
} from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = `${environment.apiGatewayUrl}/auth`;

  private _currentUser = signal<CurrentUser | null>(this.loadUser());
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(
    () => !!this._currentUser() || !!localStorage.getItem('access_token')
  );
  readonly isAdmin = computed(() => this._currentUser()?.role === 'Admin');

  constructor(private http: HttpClient, private router: Router) {}

  register(dto: RegisterRequest): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.base}/register`, dto).pipe(
      tap(tokens => this.storeTokens(tokens))
    );
  }

  login(dto: LoginRequest): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.base}/login`, dto).pipe(
      tap(tokens => this.storeTokens(tokens))
    );
  }

  refresh(): Observable<AuthTokens> {
    const refreshToken = this.getRefreshToken();
    return this.http.post<AuthTokens>(`${this.base}/refresh`, { refreshToken } as RefreshTokenRequest).pipe(
      tap(tokens => this.storeTokens(tokens))
    );
  }

  me(): Observable<CurrentUser> {
    return this.http.get<CurrentUser>(`${this.base}/me`).pipe(
      tap(user => {
        this._currentUser.set(user);
        localStorage.setItem('current_user', JSON.stringify(user));
      })
    );
  }

  /** Keeps UI in sync when profile (e.g. full name) changes without a new JWT. */
  patchCachedUser(partial: Partial<Pick<CurrentUser, 'fullName' | 'email'>>): void {
    const cur = this._currentUser();
    if (!cur) return;
    const next: CurrentUser = { ...cur, ...partial };
    this._currentUser.set(next);
    localStorage.setItem('current_user', JSON.stringify(next));
  }

  changePassword(dto: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/change-password`, dto);
  }

  sendOtp(phone: string, email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/send-otp`, { phone, email });
  }

  verifyOtp(phone: string, otpCode: string): Observable<{ verified: boolean; message: string }> {
    return this.http.post<{ verified: boolean; message: string }>(`${this.base}/verify-otp`, { phone, otpCode });
  }

  logout(): void {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      this.http.post(`${this.base}/revoke`, { refreshToken }).subscribe();
    }
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  private storeTokens(tokens: AuthTokens): void {
    localStorage.setItem('access_token', tokens.accessToken);
    localStorage.setItem('refresh_token', tokens.refreshToken);
    this.me().subscribe();
  }

  private clearSession(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_user');
    this._currentUser.set(null);
  }

  private loadUser(): CurrentUser | null {
    const raw = localStorage.getItem('current_user');
    return raw ? JSON.parse(raw) : null;
  }
}
