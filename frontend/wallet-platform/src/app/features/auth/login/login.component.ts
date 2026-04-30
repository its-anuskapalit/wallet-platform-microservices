import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <!-- Left panel: Branding -->
      <div class="auth-brand">
        <div class="brand-content">
          <div class="brand-logo-wrap">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="14" fill="url(#loginGrad)"/>
              <path d="M15 33L24 15L33 33" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M18.5 27H29.5" stroke="white" stroke-width="3" stroke-linecap="round"/>
              <defs>
                <linearGradient id="loginGrad" x1="0" y1="0" x2="48" y2="48">
                  <stop offset="0%" stop-color="#944a00"/>
                  <stop offset="100%" stop-color="#e87f24"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 class="brand-headline">Aurelian Finance</h1>
          <p class="brand-tagline">A modern heirloom for your financial life. Secure, intelligent, and beautifully designed.</p>
          <div class="brand-features">
            <div class="feature-item">
              <span class="feature-dot"></span>
              <span>Real-time wallet management</span>
            </div>
            <div class="feature-item">
              <span class="feature-dot"></span>
              <span>Seamless money transfers</span>
            </div>
            <div class="feature-item">
              <span class="feature-dot"></span>
              <span>Rewards on every transaction</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right panel: Form -->
      <div class="auth-form-panel">
        <div class="auth-form-wrap">
          <div class="form-header">
            <h2 class="headline-md">Welcome back</h2>
            <p class="body-md text-muted">Sign in to your account to continue</p>
          </div>

          @if (errorMessage()) {
            <div class="alert-error">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v3M8 11h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              {{ errorMessage() }}
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
            <div class="form-group">
              <label for="email">Email address</label>
              <input
                id="email"
                type="email"
                class="form-control"
                formControlName="email"
                placeholder="you@example.com"
                autocomplete="email"
                [class.error]="isFieldInvalid('email')"
              />
              @if (isFieldInvalid('email')) {
                <span class="field-error">Please enter a valid email</span>
              }
            </div>

            <div class="form-group">
              <label for="password">Password</label>
              <div class="password-wrap">
                <input
                  id="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  class="form-control"
                  formControlName="password"
                  placeholder="Enter your password"
                  autocomplete="current-password"
                  [class.error]="isFieldInvalid('password')"
                />
                <button type="button" class="toggle-password" (click)="togglePassword()">
                  @if (showPassword()) {
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M1.5 9s2.5-5 7.5-5 7.5 5 7.5 5-2.5 5-7.5 5-7.5-5-7.5-5z"/><circle cx="9" cy="9" r="2.5"/><path d="M2 2l14 14" stroke-width="1.5"/></svg>
                  } @else {
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M1.5 9s2.5-5 7.5-5 7.5 5 7.5 5-2.5 5-7.5 5-7.5-5-7.5-5z"/><circle cx="9" cy="9" r="2.5"/></svg>
                  }
                </button>
              </div>
              @if (isFieldInvalid('password')) {
                <span class="field-error">Password is required</span>
              }
            </div>

            <button
              type="submit"
              class="btn btn-primary w-full"
              [disabled]="loading()"
            >
              @if (loading()) {
                <span class="spinner"></span>
                Signing in...
              } @else {
                Sign in
              }
            </button>
          </form>
          <p class="auth-switch body-sm text-muted">
            Don't have an account?
            <a routerLink="/auth/register" class="text-primary">Create one</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      display: flex;
      min-height: 100vh;
      background: var(--background);
    }

    .auth-brand {
      flex: 1;
      background: linear-gradient(160deg, var(--primary) 0%, var(--primary-container) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 64px 48px;

      @media (max-width: 768px) {
        display: none;
      }
    }

    .brand-content {
      max-width: 380px;
    }

    .brand-logo-wrap {
      margin-bottom: 32px;
    }

    .brand-headline {
      font-family: var(--font-display);
      font-size: 2.5rem;
      font-weight: 800;
      color: white;
      line-height: 1.1;
      margin-bottom: 16px;
    }

    .brand-tagline {
      color: rgba(255,255,255,0.8);
      font-size: 1.0625rem;
      line-height: 1.6;
      margin-bottom: 40px;
    }

    .brand-features {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 12px;
      color: rgba(255,255,255,0.9);
      font-size: 0.9375rem;
    }

    .feature-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(255,255,255,0.6);
      flex-shrink: 0;
    }

    .auth-form-panel {
      width: 480px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 40px;
      background: var(--surface-container-lowest);

      @media (max-width: 768px) {
        width: 100%;
        padding: 32px 24px;
      }
    }

    .auth-form-wrap {
      width: 100%;
      max-width: 380px;
    }

    .form-header {
      margin-bottom: 32px;

      h2 { margin-bottom: 8px; }
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-bottom: 24px;
    }

    .password-wrap {
      position: relative;
    }

    .toggle-password {
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--on-surface-variant);
      display: flex;
      align-items: center;
      padding: 0;

      &:hover { color: var(--on-surface); }
    }

    .alert-error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: var(--error-container);
      color: var(--error);
      border-radius: var(--radius-md);
      font-size: 14px;
      margin-bottom: 20px;
    }

    .auth-switch {
      text-align: center;

      a {
        font-weight: 600;
        text-decoration: none;
        &:hover { text-decoration: underline; }
      }
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control?.invalid && control?.touched);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.form.value;
    this.auth.login({ email: email!, password: password! }).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => {
        this.errorMessage.set('Invalid email or password. Please try again.');
        this.loading.set(false);
      }
    });
  }
}
