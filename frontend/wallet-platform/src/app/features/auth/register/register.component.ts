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
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
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
