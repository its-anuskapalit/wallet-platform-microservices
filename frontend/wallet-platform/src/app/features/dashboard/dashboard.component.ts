import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { WalletService } from '../../core/services/wallet.service';
import { TransactionService } from '../../core/services/transaction.service';
import { RewardsService } from '../../core/services/rewards.service';
import { ProfileService } from '../../core/services/profile.service';
import { Wallet } from '../../core/models/wallet.models';
import { Transaction, TransactionSummary } from '../../core/models/transaction.models';
import { RewardsAccount } from '../../core/models/rewards.models';
import { KycStatus } from '../../core/models/profile.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, RouterLink],
  template: `
    <div class="dashboard page-enter">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <p class="label-sm text-muted">{{ greeting() }}</p>
          <h1 class="headline-lg">{{ currentUser()?.fullName ?? 'Welcome' }}</h1>
        </div>
        <div class="header-actions">
          <a routerLink="/wallet" class="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>
            Add Funds
          </a>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="stats-grid">
        <!-- Balance Card -->
        <div class="stat-card stat-card--primary">
          <div class="stat-header">
            <span class="stat-label">Total Balance</span>
            <div class="stat-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="4" width="16" height="12" rx="2"/><path d="M2 8h16"/><circle cx="14" cy="13" r="1.5" fill="currentColor" stroke="none"/></svg>
            </div>
          </div>
          @if (loadingWallet()) {
            <div class="skeleton" style="height: 40px; width: 180px; margin: 8px 0;"></div>
          } @else {
            <div class="stat-value">{{ wallet()?.balance | currency:wallet()?.currency ?? 'USD' }}</div>
          }
          <div class="stat-meta">
            @if (wallet()?.isFrozen) {
              <span class="badge badge-error">Frozen</span>
            } @else {
              <span class="badge badge-success">Active</span>
            }
          </div>
        </div>

        <!-- Monthly Sent -->
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Sent This Month</span>
            <div class="stat-icon stat-icon--red">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 6h12M4 14h8"/><path d="M15 11l3 3-3 3"/></svg>
            </div>
          </div>
          @if (loadingTxns()) {
            <div class="skeleton" style="height: 40px; width: 120px; margin: 8px 0;"></div>
          } @else {
            <div class="stat-value stat-value--sm">{{ txnSummary()?.thisMonthSent | currency:'INR' }}</div>
          }
          <span class="stat-meta text-muted label-md">{{ txnSummary()?.thisMonthTransactionCount ?? 0 }} transactions</span>
        </div>

        <!-- Rewards Points -->
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Reward Points</span>
            <div class="stat-icon stat-icon--gold">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 2l2.39 4.84L18 7.64l-4 3.9.94 5.46L10 14.27 5.06 17l.94-5.46-4-3.9 5.61-.8z" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
          </div>
          @if (loadingRewards()) {
            <div class="skeleton" style="height: 40px; width: 100px; margin: 8px 0;"></div>
          } @else {
            <div class="stat-value">{{ rewards()?.availablePoints ?? 0 | number }}</div>
          }
          <span class="stat-meta text-muted label-md">{{ rewards()?.tier ?? 'Standard' }} tier</span>
        </div>

        <!-- KYC Status -->
        <div class="stat-card" style="cursor:pointer;" [routerLink]="'/profile'">
          <div class="stat-header">
            <span class="stat-label">KYC Status</span>
            <div class="stat-icon" [class]="kycIconClass()">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 10.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5"/><path d="M19 7H1l9-5 9 5z"/></svg>
            </div>
          </div>
          @if (loadingProfile()) {
            <div class="skeleton" style="height: 30px; width: 100px; margin: 8px 0;"></div>
          } @else {
            <div class="stat-value stat-value--sm">{{ kycStatusLabel() }}</div>
            <span class="badge" [class]="kycBadgeClass()" style="margin-top:4px;">{{ kycStatus() }}</span>
          }
        </div>
      </div>

      <!-- Main content grid -->
      <div class="content-grid">
        <!-- Recent Transactions -->
        <div class="card transactions-card">
          <div class="card-header">
            <h3 class="title-md">Recent Transactions</h3>
            <a routerLink="/transactions" class="btn btn-ghost btn-sm">View all</a>
          </div>

          @if (loadingTxns()) {
            @for (i of [1,2,3]; track i) {
              <div class="txn-skeleton">
                <div class="skeleton" style="width: 40px; height: 40px; border-radius: 12px;"></div>
                <div style="flex:1; display:flex; flex-direction:column; gap:6px;">
                  <div class="skeleton" style="height: 14px; width: 60%;"></div>
                  <div class="skeleton" style="height: 12px; width: 40%;"></div>
                </div>
                <div class="skeleton" style="height: 14px; width: 80px;"></div>
              </div>
            }
          } @else if (recentTransactions().length === 0) {
            <div class="empty-state">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="var(--outline-variant)" stroke-width="1.5" stroke-linecap="round"><rect x="8" y="12" width="32" height="24" rx="4"/><path d="M8 20h32"/></svg>
              <p class="body-md text-muted">No transactions yet</p>
            </div>
          } @else {
            <div class="list-spaced">
              @for (txn of recentTransactions(); track txn.id) {
                <div class="txn-item">
                  <div class="txn-icon" [class]="txnIconClass(txn)">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M9 3v12M3 9h12"/></svg>
                  </div>
                  <div class="txn-info">
                    <span class="title-sm">{{ txn.type }}</span>
                    <span class="label-sm text-muted">{{ txn.createdAt | date:'MMM d, h:mm a' }}</span>
                  </div>
                  <div class="txn-amount" [class]="txnAmountClass(txn)">
                    {{ txn.amount | currency:txn.currency }}
                  </div>
                  <span class="badge" [class]="statusBadgeClass(txn.status)">{{ txn.status }}</span>
                </div>
              }
            </div>
          }
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions-panel">
          <div class="card">
            <h3 class="title-md" style="margin-bottom: 16px;">Quick Actions</h3>
            <div class="actions-list">
              <a routerLink="/wallet" class="action-item">
                <div class="action-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M10 4v12M4 10h12"/></svg>
                </div>
                <div class="action-info">
                  <span class="title-sm">Top Up Wallet</span>
                  <span class="label-sm text-muted">Add funds to your wallet</span>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M6 12l4-4-4-4"/></svg>
              </a>

              @if (kycApproved()) {
                <a routerLink="/transactions" class="action-item">
                  <div class="action-icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 6h12M4 14h8"/><path d="M15 11l3 3-3 3"/></svg>
                  </div>
                  <div class="action-info">
                    <span class="title-sm">Send Money</span>
                    <span class="label-sm text-muted">Transfer to another wallet</span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M6 12l4-4-4-4"/></svg>
                </a>
              } @else {
                <a routerLink="/profile" class="action-item action-item--disabled">
                  <div class="action-icon action-icon--muted">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 6h12M4 14h8"/><path d="M15 11l3 3-3 3"/></svg>
                  </div>
                  <div class="action-info">
                    <span class="title-sm">Send Money</span>
                    <span class="label-sm text-muted" style="color:var(--warning);">KYC verification required</span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--warning)" stroke-width="1.5" stroke-linecap="round"><path d="M8 4v5M8 11h.01"/></svg>
                </a>
              }

              <a routerLink="/rewards" class="action-item">
                <div class="action-icon action-icon--gold">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 2l2.39 4.84L18 7.64l-4 3.9.94 5.46L10 14.27 5.06 17l.94-5.46-4-3.9 5.61-.8z" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <div class="action-info">
                  <span class="title-sm">Redeem Rewards</span>
                  <span class="label-sm text-muted">{{ rewards()?.availablePoints ?? 0 }} points available</span>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M6 12l4-4-4-4"/></svg>
              </a>

              <a routerLink="/profile" class="action-item">
                <div class="action-icon action-icon--green">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="7" r="3"/><path d="M4 17c0-3.31 2.69-6 6-6s6 2.69 6 6"/></svg>
                </div>
                <div class="action-info">
                  <span class="title-sm">{{ kycApproved() ? 'KYC Verified' : 'Complete KYC' }}</span>
                  <span class="label-sm text-muted">{{ kycApproved() ? 'Identity verified ✓' : 'Verify your identity' }}</span>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M6 12l4-4-4-4"/></svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard { max-width: 1200px; }

    .page-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-bottom: 32px;

      h1 { margin-top: 4px; }
    }

    .header-actions { display: flex; gap: 12px; }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }

    .stat-card {
      background: var(--surface-container-lowest);
      border-radius: var(--radius-lg);
      padding: 24px;
      box-shadow: var(--shadow-ambient);

      &--primary {
        background: linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%);
        color: white;

        .stat-label, .stat-meta { color: rgba(255,255,255,0.75); }
        .stat-value { color: white; }
      }
    }

    .stat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .stat-label {
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.02em;
    }

    .stat-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: var(--surface-container-low);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--on-surface-variant);

      &--blue  { background: #e3f2fd; color: #1565c0; }
      &--gold  { background: #fff8e1; color: #f57f17; }
      &--green { background: var(--success-container); color: var(--success); }
      &--red   { background: #fce4ec; color: #c62828; }
    }

    .stat-value {
      font-family: var(--font-display);
      font-size: 2rem;
      font-weight: 700;
      line-height: 1.1;
      margin-bottom: 8px;

      &--sm { font-size: 1.4rem; }
    }

    .stat-meta { font-size: 13px; }

    .content-grid {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 20px;

      @media (max-width: 1024px) {
        grid-template-columns: 1fr;
      }
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .txn-skeleton {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
    }

    .txn-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
    }

    .txn-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: var(--surface-container-low);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      &.debit { background: var(--error-container); color: var(--error); }
      &.credit { background: var(--success-container); color: var(--success); }
    }

    .txn-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .txn-amount {
      font-weight: 600;
      font-size: 14px;
      white-space: nowrap;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 40px 20px;
    }

    .actions-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .action-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 12px;
      border-radius: var(--radius-md);
      text-decoration: none;
      color: var(--on-surface);
      transition: background 0.15s;

      &:hover { background: var(--surface-container-low); }
    }

    .action-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: var(--primary-fixed);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      &--gold  { background: #fff8e1; color: #f57f17; }
      &--green { background: var(--success-container); color: var(--success); }
      &--muted { background: var(--surface-container-low); color: var(--on-surface-variant); }
      &--red   { background: #fce4ec; color: #c62828; }
    }

    .action-item--disabled { opacity: 0.85; }

    .action-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
  `]
})
export class DashboardComponent implements OnInit {
  private auth       = inject(AuthService);
  private walletSvc  = inject(WalletService);
  private txnSvc     = inject(TransactionService);
  private rewardsSvc = inject(RewardsService);
  private profileSvc = inject(ProfileService);
  private router     = inject(Router);

  currentUser  = this.auth.currentUser;
  wallet       = signal<Wallet | null>(null);
  transactions = signal<Transaction[]>([]);
  rewards      = signal<RewardsAccount | null>(null);
  kycStatus    = signal<KycStatus>('NotSubmitted');
  txnSummary   = signal<TransactionSummary | null>(null);

  loadingWallet  = signal(true);
  loadingTxns    = signal(true);
  loadingRewards = signal(true);
  loadingProfile = signal(true);

  greeting = signal(this.getGreeting());

  kycApproved = computed(() => this.kycStatus() === 'Approved');

  ngOnInit(): void {
    this.loadAll();

    // Re-fetch rewards & wallet every time user navigates back to dashboard
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd && e.urlAfterRedirects === '/dashboard')
    ).subscribe(() => this.refreshLiveData());
  }

  private loadAll(): void {
    this.walletSvc.getWallet().subscribe({
      next: w => { this.wallet.set(w); this.loadingWallet.set(false); },
      error: () => this.loadingWallet.set(false)
    });
    this.txnSvc.getMyTransactions(1, 5).subscribe({
      next: t => { this.transactions.set(t); this.loadingTxns.set(false); },
      error: () => this.loadingTxns.set(false)
    });
    this.txnSvc.getSummary().subscribe({
      next: s => this.txnSummary.set(s),
      error: () => {}
    });
    this.rewardsSvc.getRewards().subscribe({
      next: r => { this.rewards.set(r); this.loadingRewards.set(false); },
      error: () => this.loadingRewards.set(false)
    });
    this.profileSvc.getProfile().subscribe({
      next: p => { this.kycStatus.set(p.kycStatus ?? 'NotSubmitted'); this.loadingProfile.set(false); },
      error: () => this.loadingProfile.set(false)
    });
  }

  private refreshLiveData(): void {
    // Silently refresh points and wallet balance without showing skeletons
    this.rewardsSvc.getRewards().subscribe({
      next: r => this.rewards.set(r), error: () => {}
    });
    this.walletSvc.getWallet().subscribe({
      next: w => this.wallet.set(w), error: () => {}
    });
    this.txnSvc.getMyTransactions(1, 5).subscribe({
      next: t => this.transactions.set(t), error: () => {}
    });
  }

  kycStatusLabel(): string {
    const map: Record<KycStatus, string> = {
      NotSubmitted: 'Not Submitted',
      Pending:      'Under Review',
      Approved:     'Verified',
      Rejected:     'Rejected'
    };
    return map[this.kycStatus()] ?? 'Unknown';
  }

  kycBadgeClass(): string {
    const map: Record<KycStatus, string> = {
      Approved:     'badge badge-success',
      Pending:      'badge badge-warning',
      Rejected:     'badge badge-error',
      NotSubmitted: 'badge badge-neutral'
    };
    return map[this.kycStatus()] ?? 'badge badge-neutral';
  }

  kycIconClass(): string {
    const map: Record<KycStatus, string> = {
      Approved:     'stat-icon stat-icon--green',
      Pending:      'stat-icon stat-icon--gold',
      Rejected:     'stat-icon stat-icon--red',
      NotSubmitted: 'stat-icon'
    };
    return map[this.kycStatus()] ?? 'stat-icon';
  }

  recentTransactions() {
    return this.transactions().slice(0, 5);
  }

  txnIconClass(txn: Transaction): string {
    return txn.type === 'TopUp' ? 'credit' : 'debit';
  }

  txnAmountClass(txn: Transaction): string {
    return txn.type === 'TopUp' ? 'amount-positive' : 'amount-negative';
  }

  statusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      Completed: 'badge badge-success',
      Failed: 'badge badge-error',
      Pending: 'badge badge-warning'
    };
    return map[status] ?? 'badge badge-neutral';
  }

  private getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }
}
