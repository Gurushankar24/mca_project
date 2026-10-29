import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { LoginResponse, User, UserRole } from './models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenStorageKey = 'auth_token';

  readonly currentUser = signal<User | null>(null);
  readonly token = signal<string | null>(this.readStoredToken());
  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly role = computed<UserRole | null>(() => this.currentUser()?.role ?? null);

  login(email: string, password: string): Observable<User> {
    return this.http.post<LoginResponse>('/api/auth/login', { email, password }).pipe(
      tap(({ token, user }) => {
        this.storeToken(token);
        this.currentUser.set(user);
      }),
      map((response) => response.user),
    );
  }

  logout(): void {
    this.currentUser.set(null);
    this.token.set(null);
    this.removeStoredToken();
  }

  restoreSession(): Observable<User | null> {
    if (!this.token()) {
      return of(null);
    }

    return this.http.get<User>('/api/auth/me').pipe(
      tap((user) => this.currentUser.set(user)),
      catchError(() => {
        this.logout();
        return of(null);
      }),
    );
  }

  private readStoredToken(): string | null {
    try {
      return localStorage.getItem(this.tokenStorageKey);
    } catch {
      return null;
    }
  }

  private storeToken(token: string): void {
    this.token.set(token);
    try {
      localStorage.setItem(this.tokenStorageKey, token);
    } catch {
      // Keep the in-memory session available if browser storage is disabled.
    }
  }

  private removeStoredToken(): void {
    try {
      localStorage.removeItem(this.tokenStorageKey);
    } catch {
      // The in-memory session is already cleared if browser storage is disabled.
    }
  }
}
