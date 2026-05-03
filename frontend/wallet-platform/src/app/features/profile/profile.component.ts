import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ClipboardService } from '../../core/services/clipboard.service';
import { SkeletonBlockComponent } from '../../shared/skeleton-block/skeleton-block.component';
import { UserProfile, KycStatus } from '../../core/models/profile.models';

type KycStep = 'personal' | 'document' | 'status';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, DatePipe, ReactiveFormsModule, SkeletonBlockComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  private profileSvc = inject(ProfileService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private clipboard = inject(ClipboardService);

  profile = signal<UserProfile | null>(null);
  loadingProfile = signal(true);
  editMode = signal(false);
  savingProfile = signal(false);
  submittingKyc = signal(false);
  profileError = signal<string | null>(null);
  kycError = signal<string | null>(null);
  rejectionReason = signal<string | null>(null);

  // Security section
  showPasswordSection = signal(false);
  changingPassword = signal(false);
  passwordError = signal<string | null>(null);

  passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword:     ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  });

  togglePasswordSection(): void {
    this.showPasswordSection.update(v => !v);
    this.passwordForm.reset();
    this.passwordError.set(null);
  }

  onChangePassword(): void {
    if (this.passwordForm.invalid) { this.passwordForm.markAllAsTouched(); return; }
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;
    if (newPassword !== confirmPassword) {
      this.passwordError.set('New passwords do not match.');
      return;
    }
    this.changingPassword.set(true);
    this.passwordError.set(null);
    this.auth.changePassword({ currentPassword: currentPassword!, newPassword: newPassword! }).subscribe({
      next: () => {
        this.changingPassword.set(false);
        this.passwordForm.reset();
        this.toast.success('Password updated');
      },
      error: err => {
        this.changingPassword.set(false);
        this.passwordError.set(err.error?.error ?? 'Failed to change password.');
      }
    });
  }

  initials = computed(() => {
    const name = this.profile()?.fullName ?? '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  });

  kycStatus = computed(() => this.profile()?.kycStatus ?? 'NotSubmitted');

  personalDetailsDone = computed(() => {
    const p = this.profile();
    return !!(p?.fullName && p?.phone && p?.address && p?.dateOfBirth);
  });

  kycDocSubmitted = computed(() => {
    const s = this.kycStatus();
    return s === 'Pending' || s === 'Approved' || s === 'Rejected';
  });

  kycApproved = computed(() => this.kycStatus() === 'Approved');

  activeKycStep = computed((): KycStep => {
    if (!this.personalDetailsDone()) return 'personal';
    if (!this.kycDocSubmitted()) return 'document';
    return 'status';
  });

  documentTypes = [
    {
      value: 'Aadhaar',
      label: 'Aadhaar',
      icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="3" width="18" height="16" rx="2"/><circle cx="8" cy="11" r="2.5"/><path d="M13 8h4M13 11h4M13 14h2"/></svg>`
    },
    {
      value: 'Passport',
      label: 'Passport',
      icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="4" y="1" width="14" height="20" rx="2"/><circle cx="11" cy="10" r="3"/><path d="M7 16h8M8 18h6"/></svg>`
    },
    {
      value: 'PAN',
      label: 'PAN Card',
      icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="1" y="4" width="20" height="14" rx="2"/><path d="M1 9h20"/><path d="M5 14h4M11 14h6"/></svg>`
    },
    {
      value: 'DriversLicense',
      label: "Driver's Licence",
      icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="1" y="4" width="20" height="14" rx="2"/><circle cx="7" cy="12" r="2"/><path d="M11 9h6M11 12h4M11 15h6"/></svg>`
    },
    {
      value: 'VoterId',
      label: "Voter ID",
      icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="3" width="18" height="16" rx="2"/><path d="M7 11l3 3 5-6"/></svg>`
    },
    {
      value: 'NationalID',
      label: "National ID",
      icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="1" y="4" width="20" height="14" rx="2"/><circle cx="7" cy="11" r="2"/><path d="M11 8h6M11 11h6M11 14h4"/></svg>`
    }
  ];

  verifiedPerks = [
    { label: 'Increased transaction limits' },
    { label: 'Faster withdrawal processing' },
    { label: 'Access to premium financial products' },
    { label: 'Enhanced account security status' }
  ];

  profileForm = this.fb.group({
    fullName:    ['', [Validators.required, Validators.minLength(2)]],
    phone:       ['', Validators.required],
    address:     ['', Validators.required],
    dateOfBirth: ['', Validators.required]
  });

  kycForm = this.fb.group({
    documentType:   ['', Validators.required],
    documentNumber: ['', Validators.required],
    nameOnDocument: ['', Validators.required],
    consent:        [false, Validators.requiredTrue]
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loadingProfile.set(true);
    this.profileSvc.getProfile().subscribe({
      next: p => {
        this.profile.set(p);
        this.profileForm.patchValue({
          fullName:    p.fullName ?? '',
          phone:       p.phone    ?? '',
          address:     p.address  ?? '',
          dateOfBirth: p.dateOfBirth ?? ''
        });
        this.kycForm.patchValue({ nameOnDocument: p.fullName ?? '' });
        this.loadingProfile.set(false);
      },
      error: () => this.loadingProfile.set(false)
    });
  }

  copyProfileEmail(): void {
    const email = this.profile()?.email;
    if (email) void this.clipboard.copy(email, 'Email copied');
  }

  startEdit(): void {
    this.profileError.set(null);
    this.editMode.set(true);
  }

  cancelEdit(): void {
    this.editMode.set(false);
    const p = this.profile();
    if (p) {
      this.profileForm.patchValue({
        fullName: p.fullName, phone: p.phone ?? '',
        address: p.address ?? '', dateOfBirth: p.dateOfBirth ?? ''
      });
    }
  }

  onSaveProfile(): void {
    if (this.profileForm.invalid) { this.profileForm.markAllAsTouched(); return; }
    this.savingProfile.set(true);
    this.profileError.set(null);
    const { fullName, phone, address, dateOfBirth } = this.profileForm.value;
    this.profileSvc.updateProfile({
      fullName: fullName || undefined,
      phone: phone || undefined,
      address: address || undefined,
      dateOfBirth: dateOfBirth || undefined
    }).subscribe({
      next: p => {
        this.profile.set(p);
        this.auth.patchCachedUser({ fullName: p.fullName });
        this.savingProfile.set(false);
        this.editMode.set(false);
        this.toast.success('Profile saved');
        this.kycForm.patchValue({ nameOnDocument: p.fullName });
      },
      error: err => {
        this.profileError.set(err.error?.error ?? 'Failed to save profile.');
        this.savingProfile.set(false);
      }
    });
  }

  onSubmitKyc(): void {
    if (this.kycForm.invalid) { this.kycForm.markAllAsTouched(); return; }
    this.submittingKyc.set(true);
    this.kycError.set(null);
    const { documentType, documentNumber } = this.kycForm.value;
    this.profileSvc.submitKyc({
      documentType: documentType!,
      documentNumber: documentNumber!
    }).subscribe({
      next: () => {
        this.submittingKyc.set(false);
        this.profile.update(p => p ? { ...p, kycStatus: 'Pending' as KycStatus } : p);
        this.toast.success('KYC documents submitted for review');
      },
      error: err => {
        this.kycError.set(err.error?.error ?? 'Submission failed. Please try again.');
        this.submittingKyc.set(false);
      }
    });
  }

  docNumberPlaceholder(): string {
    const map: Record<string, string> = {
      Aadhaar: 'e.g. 1234 5678 9012',
      Passport: 'e.g. A1234567',
      PAN: 'e.g. ABCDE1234F',
      DriversLicense: 'e.g. DL-1234567890123',
      VoterId: 'e.g. ABC1234567',
      NationalID: 'e.g. 1234567890'
    };
    return map[this.kycForm.get('documentType')?.value ?? ''] ?? 'Enter document number';
  }

  isInvalid(field: string): boolean {
    const c = this.profileForm.get(field);
    return !!(c?.invalid && c?.touched);
  }

  isKycInvalid(field: string): boolean {
    const c = this.kycForm.get(field);
    return !!(c?.invalid && c?.touched);
  }

  kycStatusLabel(): string {
    const map: Record<KycStatus, string> = {
      NotSubmitted: 'Not Submitted',
      Pending: 'Pending Review',
      Approved: 'Verified',
      Rejected: 'Rejected'
    };
    return map[this.kycStatus()] ?? 'Unknown';
  }

  kycBadgeClass(): string {
    const map: Record<KycStatus, string> = {
      Approved: 'badge badge-success',
      Pending: 'badge badge-warning',
      Rejected: 'badge badge-error',
      NotSubmitted: 'badge badge-neutral'
    };
    return map[this.kycStatus()] ?? 'badge badge-neutral';
  }
}
