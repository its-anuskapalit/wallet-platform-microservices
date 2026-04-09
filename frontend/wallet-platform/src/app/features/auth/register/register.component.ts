import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm  = control.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordMismatch: true };
}

type Step = 'details' | 'otp';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <!-- Left Brand Panel -->
      <div class="auth-brand">
        <div class="brand-content">
          <div class="brand-logo-wrap">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="14" fill="rgba(255,255,255,0.2)"/>
              <path d="M15 33L24 15L33 33" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M18.5 27H29.5" stroke="white" stroke-width="3" stroke-linecap="round"/>
            </svg>
          </div>
          <h1 class="brand-headline">Start your journey</h1>
          <p class="brand-tagline">Join thousands of users managing their finances with clarity, confidence, and elegance.</p>

          <!-- Step indicator -->
          <div class="step-indicator">
            <div class="step-dot" [class.active]="step() === 'details'" [class.done]="step() === 'otp'">
              <span>1</span>
            </div>
            <div class="step-line"></div>
            <div class="step-dot" [class.active]="step() === 'otp'">
              <span>2</span>
            </div>
          </div>
          <div class="step-labels">
            <span [class.active]="step() === 'details'">Your Details</span>
            <span [class.active]="step() === 'otp'">Verify Phone</span>
          </div>
        </div>
      </div>

      <!-- Right Form Panel -->
      <div class="auth-form-panel">
        <div class="auth-form-wrap">

          <!-- ── Step 1: Details ── -->
          @if (step() === 'details') {
            <div class="form-header">
              <h2 class="headline-md">Create account</h2>
              <p class="body-md text-muted">Fill in your details to get started</p>
            </div>

            @if (errorMessage()) {
              <div class="alert-error">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v3M8 11h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                {{ errorMessage() }}
              </div>
            }

            <form [formGroup]="form" (ngSubmit)="onSendOtp()" class="auth-form">
              <div class="form-group">
                <label for="fullName">Full name</label>
                <input id="fullName" type="text" class="form-control" formControlName="fullName"
                       placeholder="Jane Doe" autocomplete="name"
                       [class.error]="isFieldInvalid('fullName')"/>
                @if (isFieldInvalid('fullName')) {
                  <span class="field-error">Full name is required</span>
                }
              </div>

              <div class="form-group">
                <label for="email">Email address</label>
                <input id="email" type="email" class="form-control" formControlName="email"
                       placeholder="you@example.com" autocomplete="email"
                       [class.error]="isFieldInvalid('email')"/>
                @if (isFieldInvalid('email')) {
                  <span class="field-error">Please enter a valid email</span>
                }
              </div>

              <div class="form-group">
                <label for="phone">
                  Phone number
                  <span class="field-badge">OTP will be sent</span>
                </label>
                <div class="phone-input-wrap">
                  <span class="phone-prefix">+91</span>
                  <input id="phone" type="tel" class="form-control phone-input" formControlName="phone"
                         placeholder="10-digit mobile number" autocomplete="tel" maxlength="10"
                         [class.error]="isFieldInvalid('phone')"/>
                </div>
                @if (isFieldInvalid('phone')) {
                  <span class="field-error">Please enter a valid 10-digit phone number</span>
                }
              </div>

              <div class="form-group">
                <label for="password">Password</label>
                <input id="password" type="password" class="form-control" formControlName="password"
                       placeholder="Minimum 8 characters" autocomplete="new-password"
                       [class.error]="isFieldInvalid('password')"/>
                @if (isFieldInvalid('password')) {
                  <span class="field-error">Password must be at least 8 characters</span>
                }
              </div>

              <div class="form-group">
                <label for="confirmPassword">Confirm password</label>
                <input id="confirmPassword" type="password" class="form-control" formControlName="confirmPassword"
                       placeholder="Repeat your password" autocomplete="new-password"
                       [class.error]="isFieldInvalid('confirmPassword') || form.errors?.['passwordMismatch']"/>
                @if (form.errors?.['passwordMismatch'] && form.get('confirmPassword')?.touched) {
                  <span class="field-error">Passwords do not match</span>
                }
              </div>

              <button type="submit" class="btn btn-primary w-full" [disabled]="sendingOtp()">
                @if (sendingOtp()) {
                  <span class="spinner"></span> Sending OTP...
                } @else {
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M14 2L2 6l5 3 3 5 4-12z"/></svg>
                  Send OTP & Continue
                }
              </button>
            </form>
          }

          <!-- ── Step 2: OTP Verification ── -->
          @if (step() === 'otp') {
            <div class="form-header">
              <h2 class="headline-md">Verify your phone</h2>
              <p class="body-md text-muted">
                Enter the 6-digit OTP sent to <strong>{{ form.value.email }}</strong>
              </p>
              @if (otpSentMsg()) {
                <div class="otp-sent-banner">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M13 2L1 5.5l4.5 2.5 2.5 4.5L13 2z"/></svg>
                  {{ otpSentMsg() }}
                </div>
              }
            </div>

            @if (otpError()) {
              <div class="alert-error">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v3M8 11h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                {{ otpError() }}
              </div>
            }

            <form [formGroup]="otpForm" (ngSubmit)="onVerifyAndRegister()" class="auth-form">
              <div class="otp-boxes-wrap">
                <label class="form-label">Enter 6-digit OTP</label>
                <input type="text" class="form-control otp-input" formControlName="otpCode"
                       placeholder="e.g. 483921" maxlength="6" autocomplete="one-time-code"
                       [class.error]="otpForm.get('otpCode')?.invalid && otpForm.get('otpCode')?.touched"/>
                @if (otpForm.get('otpCode')?.invalid && otpForm.get('otpCode')?.touched) {
                  <span class="field-error">Please enter the 6-digit OTP</span>
                }
              </div>

              <button type="submit" class="btn btn-primary w-full" [disabled]="loading()">
                @if (loading()) {
                  <span class="spinner"></span> Creating account...
                } @else {
                  Verify & Create Account
                }
              </button>
            </form>

            <button class="resend-btn" (click)="onResendOtp()" [disabled]="sendingOtp()">
              @if (sendingOtp()) { Resending... }
              @else { Didn't receive it? Resend OTP }
            </button>

            <button class="back-btn" (click)="goBack()">
              ← Back to details
            </button>
          }

          <p class="auth-switch body-sm text-muted">
            Already have an account?
            <a routerLink="/auth/login" class="text-primary">Sign in</a>
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
      background: linear-gradient(160deg, #3d1a00 0%, var(--primary) 50%, var(--primary-container) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 64px 48px;
      @media (max-width: 768px) { display: none; }
    }

    .brand-content { max-width: 380px; }
    .brand-logo-wrap { margin-bottom: 32px; }

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

    .step-indicator {
      display: flex;
      align-items: center;
      gap: 0;
      margin-bottom: 10px;
    }

    .step-dot {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      color: rgba(255,255,255,0.6);
      transition: all 0.3s ease;

      &.active {
        background: white;
        color: var(--primary);
      }

      &.done {
        background: rgba(255,255,255,0.7);
        color: var(--primary);
      }
    }

    .step-line {
      flex: 1;
      height: 2px;
      background: rgba(255,255,255,0.3);
      margin: 0 8px;
    }

    .step-labels {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: rgba(255,255,255,0.6);

      span.active { color: white; font-weight: 600; }
    }

    .auth-form-panel {
      width: 480px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 40px;
      background: var(--surface-container-lowest);
      overflow-y: auto;
      @media (max-width: 768px) { width: 100%; padding: 32px 24px; }
    }

    .auth-form-wrap { width: 100%; max-width: 380px; }

    .form-header {
      margin-bottom: 28px;
      h2 { margin-bottom: 8px; }
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 18px;
      margin-bottom: 24px;
    }

    .field-badge {
      display: inline-block;
      margin-left: 6px;
      padding: 1px 6px;
      background: rgba(123,63,0,0.1);
      color: var(--primary);
      border-radius: 10px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .phone-input-wrap {
      display: flex;
      align-items: center;
      gap: 0;
      border: 1px solid var(--outline-variant);
      border-radius: var(--radius-md);
      overflow: hidden;
      transition: border-color 0.15s;

      &:focus-within { border-color: var(--primary); }
    }

    .phone-prefix {
      padding: 0 12px;
      font-size: 14px;
      font-weight: 600;
      color: var(--on-surface-variant);
      background: var(--surface-container-low);
      border-right: 1px solid var(--outline-variant);
      height: 100%;
      display: flex;
      align-items: center;
      white-space: nowrap;
    }

    .phone-input.form-control {
      border: none;
      border-radius: 0;
      flex: 1;

      &:focus { box-shadow: none; }
    }

    .otp-sent-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
      padding: 10px 14px;
      background: #e8f5e9;
      color: #2e7d32;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 500;
    }

    .otp-input {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: 0.3em;
      text-align: center;
    }

    .resend-btn {
      width: 100%;
      background: none;
      border: none;
      color: var(--primary);
      font-size: 13px;
      cursor: pointer;
      padding: 8px;
      text-align: center;
      text-decoration: underline;
      margin-top: -12px;

      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    .back-btn {
      width: 100%;
      background: none;
      border: none;
      color: var(--on-surface-variant);
      font-size: 13px;
      cursor: pointer;
      padding: 8px;
      text-align: center;
      margin-top: 4px;

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
      a { font-weight: 600; text-decoration: none; &:hover { text-decoration: underline; } }
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class RegisterComponent {
  private fb   = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  step         = signal<Step>('details');
  loading      = signal(false);
  sendingOtp   = signal(false);
  errorMessage = signal<string | null>(null);
  otpError     = signal<string | null>(null);
  otpSentMsg   = signal<string | null>(null);

  form = this.fb.group({
    fullName:        ['', [Validators.required, Validators.minLength(2)]],
    email:           ['', [Validators.required, Validators.email]],
    phone:           ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    password:        ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordMatchValidator });

  otpForm = this.fb.group({
    otpCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
  });

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control?.invalid && control?.touched);
  }

  onSendOtp(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.sendingOtp.set(true);
    this.errorMessage.set(null);

    const phone = this.form.value.phone!;
    const email = this.form.value.email!;
    this.auth.sendOtp(phone, email).subscribe({
      next: (res) => {
        this.sendingOtp.set(false);
        this.step.set('otp');
        this.otpSentMsg.set(res.message);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.error ?? 'Failed to send OTP. Please try again.');
        this.sendingOtp.set(false);
      }
    });
  }

  onResendOtp(): void {
    this.sendingOtp.set(true);
    this.otpError.set(null);
    this.otpSentMsg.set(null);

    const phone = this.form.value.phone!;
    const email = this.form.value.email!;
    this.auth.sendOtp(phone, email).subscribe({
      next: (res) => {
        this.sendingOtp.set(false);
        this.otpSentMsg.set(res.message);
      },
      error: (err) => {
        this.otpError.set(err.error?.error ?? 'Failed to resend OTP.');
        this.sendingOtp.set(false);
      }
    });
  }

  onVerifyAndRegister(): void {
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.otpError.set(null);

    const phone   = this.form.value.phone!;
    const otpCode = this.otpForm.value.otpCode!;

    this.auth.verifyOtp(phone, otpCode).subscribe({
      next: () => {
        const { fullName, email, password } = this.form.value;
        this.auth.register({
          fullName: fullName!,
          email:    email!,
          password: password!,
          phone:    phone
        }).subscribe({
          next: () => this.router.navigate(['/dashboard']),
          error: (err) => {
            this.otpError.set(err.error?.error ?? 'Registration failed. Please try again.');
            this.loading.set(false);
          }
        });
      },
      error: (err) => {
        this.otpError.set(err.error?.error ?? 'Invalid OTP. Please try again.');
        this.loading.set(false);
      }
    });
  }

  goBack(): void {
    this.step.set('details');
    this.otpForm.reset();
    this.otpError.set(null);
    this.otpSentMsg.set(null);
  }
}
