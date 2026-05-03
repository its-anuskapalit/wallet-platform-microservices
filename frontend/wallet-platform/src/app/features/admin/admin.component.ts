import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { ProfileService } from '../../core/services/profile.service';
import { AdminDashboard, FraudFlag } from '../../core/models/admin.models';
import { UserProfile, PagedResult } from '../../core/models/profile.models';

type AdminTab = 'dashboard' | 'kyc' | 'users';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, DatePipe, ReactiveFormsModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
  private adminSvc   = inject(AdminService);
  private profileSvc = inject(ProfileService);
  private fb         = inject(FormBuilder);

  // ── Tab ───────────────────────────────────────────────────────────────────
  activeTab = signal<AdminTab>('dashboard');

  // ── Fraud dashboard ───────────────────────────────────────────────────────
  dashboard     = signal<AdminDashboard | null>(null);
  fraudFlags    = signal<FraudFlag[]>([]);
  loadingDashboard = signal(true);
  loadingFlags  = signal(true);
  submittingFlag = signal(false);
  flagSuccess   = signal<string | null>(null);
  flagError     = signal<string | null>(null);

  resolvedCount = () =>
    (this.dashboard()?.totalFraudFlags ?? 0) - (this.dashboard()?.unresolvedFraudFlags ?? 0);

  flagForm = this.fb.group({
    transactionId: ['', Validators.required],
    reason:        ['', [Validators.required, Validators.minLength(10)]]
  });

  // ── KYC Review ────────────────────────────────────────────────────────────
  lookedUpProfile  = signal<UserProfile | null>(null);
  lookingUp        = signal(false);
  lookupError      = signal<string | null>(null);
  submittingReview = signal(false);
  reviewSuccess    = signal<string | null>(null);
  reviewError      = signal<string | null>(null);
  pendingKycCount  = signal(0);

  lookupForm = this.fb.group({ userId: ['', [Validators.required, Validators.email]] });

  reviewForm = this.fb.group({
    decision:        ['', Validators.required],
    rejectionReason: [''],
    notes:           ['']
  });

  profileInitials = () => {
    const name = this.lookedUpProfile()?.fullName ?? '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  };

  ngOnInit(): void {
    this.adminSvc.getDashboard().subscribe({
      next: d => { this.dashboard.set(d); this.loadingDashboard.set(false); },
      error: () => this.loadingDashboard.set(false)
    });
    this.loadFraudFlags();
  }

  loadFraudFlags(): void {
    this.loadingFlags.set(true);
    this.adminSvc.getFraudFlags().subscribe({
      next: f => { this.fraudFlags.set(f); this.loadingFlags.set(false); },
      error: () => this.loadingFlags.set(false)
    });
  }

  onFlagTransaction(): void {
    if (this.flagForm.invalid) { this.flagForm.markAllAsTouched(); return; }
    this.submittingFlag.set(true);
    this.flagSuccess.set(null);
    this.flagError.set(null);
    const { transactionId, reason } = this.flagForm.value;
    this.adminSvc.flagTransaction(transactionId!, { reason: reason! }).subscribe({
      next: flag => {
        this.fraudFlags.update(f => [flag, ...f]);
        this.submittingFlag.set(false);
        this.flagSuccess.set('Transaction flagged successfully.');
        this.flagForm.reset();
        this.adminSvc.getDashboard().subscribe(d => this.dashboard.set(d));
      },
      error: err => {
        this.flagError.set(err.error?.error ?? 'Failed to flag transaction.');
        this.submittingFlag.set(false);
      }
    });
  }

  // KYC: look up a user profile by email address
  onLookup(): void {
    const email = this.lookupForm.value.userId?.trim();
    if (!email) { this.lookupError.set('Please enter an email address.'); return; }

    this.lookingUp.set(true);
    this.lookupError.set(null);
    this.lookedUpProfile.set(null);
    this.reviewSuccess.set(null);
    this.reviewError.set(null);
    this.reviewForm.reset();

    this.profileSvc.lookupByEmail(email).subscribe({
      next: p => {
        this.lookedUpProfile.set(p);
        this.lookingUp.set(false);
        if (p.kycStatus === 'Pending') {
          this.pendingKycCount.update(n => Math.max(n, 1));
        }
      },
      error: err => {
        this.lookupError.set(err.error?.error ?? 'No user found with that email address.');
        this.lookingUp.set(false);
      }
    });
  }

  clearLookup(): void {
    this.lookedUpProfile.set(null);
    this.lookupForm.reset();
    this.reviewForm.reset();
    this.reviewSuccess.set(null);
    this.reviewError.set(null);
  }

  onSubmitReview(): void {
    const decision = this.reviewForm.get('decision')?.value;
    const rejectionReason = this.reviewForm.get('rejectionReason')?.value;

    if (!decision) return;

    if (decision === 'reject') {
      this.reviewForm.get('rejectionReason')?.setValidators(Validators.required);
      this.reviewForm.get('rejectionReason')?.updateValueAndValidity();
      if (!rejectionReason?.trim()) {
        this.reviewForm.markAllAsTouched();
        return;
      }
    }

    this.submittingReview.set(true);
    this.reviewSuccess.set(null);
    this.reviewError.set(null);

    const userId = this.lookedUpProfile()!.userId;  // use the resolved userId, not the typed email
    const isApprove = decision === 'approve';

    this.profileSvc.reviewKyc(userId, {
      approve: isApprove,
      rejectionReason: isApprove ? undefined : (rejectionReason ?? undefined)
    }).subscribe({
      next: res => {
        this.submittingReview.set(false);
        const newStatus = isApprove ? 'Approved' : 'Rejected';
        this.reviewSuccess.set(
          isApprove
            ? `KYC approved successfully. User has been notified.`
            : `KYC rejected. User has been notified with the reason provided.`
        );
        this.lookedUpProfile.update(p => p ? { ...p, kycStatus: newStatus as any } : p);
        this.reviewForm.reset();
        this.adminSvc.getDashboard().subscribe(d => this.dashboard.set(d));
      },
      error: err => {
        this.reviewError.set(err.error?.error ?? 'Review submission failed. Please try again.');
        this.submittingReview.set(false);
      }
    });
  }

  // ── Users tab ─────────────────────────────────────────────────────────────
  usersPage         = signal<PagedResult<UserProfile>>({ items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0 });
  loadingUsers      = signal(false);
  currentPage       = signal(1);
  freezingUserId    = signal<string | null>(null);
  freezeTargetId    = signal<string | null>(null);
  freezeReason      = '';
  userActionSuccess = signal<string | null>(null);
  userActionError   = signal<string | null>(null);

  onOpenUsersTab(): void {
    this.activeTab.set('users');
    if (this.usersPage().items.length === 0) this.loadUsers(1);
  }

  loadUsers(page: number): void {
    if (page < 1 || page > (this.usersPage().totalPages || 999)) return;
    this.loadingUsers.set(true);
    this.currentPage.set(page);
    this.adminSvc.getAllUsers(page, 20).subscribe({
      next: p => { this.usersPage.set(p); this.loadingUsers.set(false); },
      error: () => this.loadingUsers.set(false)
    });
  }

  startFreeze(userId: string): void {
    this.freezeTargetId.set(userId);
    this.freezeReason = '';
    this.userActionSuccess.set(null);
    this.userActionError.set(null);
  }

  cancelFreeze(): void {
    this.freezeTargetId.set(null);
    this.freezeReason = '';
  }

  confirmFreeze(user: UserProfile): void {
    if (!this.freezeReason.trim()) return;
    this.freezingUserId.set(user.userId);
    this.userActionSuccess.set(null);
    this.userActionError.set(null);
    this.adminSvc.freezeWallet(user.userId, this.freezeReason.trim()).subscribe({
      next: () => {
        this.freezingUserId.set(null);
        this.freezeTargetId.set(null);
        this.freezeReason = '';
        this.userActionSuccess.set(`✓ Wallet frozen for ${user.email}.`);
      },
      error: err => {
        this.freezingUserId.set(null);
        this.userActionError.set(err.error?.error ?? 'Failed to freeze wallet.');
      }
    });
  }

  onUnfreezeUser(user: UserProfile): void {
    this.freezingUserId.set(user.userId);
    this.userActionSuccess.set(null);
    this.userActionError.set(null);
    this.adminSvc.unfreezeWallet(user.userId).subscribe({
      next: () => {
        this.freezingUserId.set(null);
        this.userActionSuccess.set(`Wallet unfrozen for ${user.email}.`);
      },
      error: err => {
        this.freezingUserId.set(null);
        this.userActionError.set(err.error?.error ?? 'Failed to unfreeze wallet.');
      }
    });
  }

  userInitials(user: UserProfile): string {
    const name = user.fullName ?? '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || user.email[0].toUpperCase();
  }

  kycStatusBadge(status: string | undefined): string {
    const map: Record<string, string> = {
      Approved: 'badge badge-success',
      Pending: 'badge badge-warning',
      Rejected: 'badge badge-error',
      NotSubmitted: 'badge badge-neutral'
    };
    return map[status ?? ''] ?? 'badge badge-neutral';
  }
}
