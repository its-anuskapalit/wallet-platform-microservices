import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { WalletService } from '../../core/services/wallet.service';
import { TransactionService } from '../../core/services/transaction.service';
import { RewardsService } from '../../core/services/rewards.service';
import { ProfileService } from '../../core/services/profile.service';
import { WalletNicknameService } from '../../core/services/wallet-nickname.service';
import { BalanceVisibilityService } from '../../core/services/balance-visibility.service';
import { Wallet } from '../../core/models/wallet.models';
import { Transaction, TransactionSummary } from '../../core/models/transaction.models';
import { RewardsAccount } from '../../core/models/rewards.models';
import { KycStatus, UserProfile } from '../../core/models/profile.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private auth       = inject(AuthService);
  private walletSvc  = inject(WalletService);
  private txnSvc     = inject(TransactionService);
  private rewardsSvc = inject(RewardsService);
  private profileSvc = inject(ProfileService);
  private router     = inject(Router);
  nicknameSvc        = inject(WalletNicknameService);
  balanceVis           = inject(BalanceVisibilityService);

  currentUser  = this.auth.currentUser;
  userProfile  = signal<UserProfile | null>(null);
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

  /** Profile is source of truth for name; JWT/localStorage may be stale after profile edits. */
  displayName = computed(() => {
    const fromProfile = this.userProfile()?.fullName?.trim();
    if (fromProfile) return fromProfile;
    const fromAuth = this.currentUser()?.fullName?.trim();
    return fromAuth || 'Welcome';
  });

  // Animated display values
  displayBalance = signal(0);
  displayPoints  = signal(0);

  // Spending breakdown for donut chart
  spendingData = computed(() => {
    const txns = this.transactions();
    const topUp    = txns.filter(t => t.type === 'TopUp').length;
    const transfer = txns.filter(t => t.type === 'Transfer').length;
    const deduction = txns.filter(t => t.type === 'Deduction').length;
    return { topUp, transfer, deduction, total: txns.length };
  });

  donutSegments = computed(() => {
    const d = this.spendingData();
    const circumference = 289; // 2*π*46
    const total = d.total || 1;
    const colors = ['#52b788', '#e87f24', '#f28b82'];
    const labels = ['Top Up', 'Transfer', 'Deduction'];
    const counts = [d.topUp, d.transfer, d.deduction];
    let offset = 0;
    return counts.map((count, i) => {
      const dash = (count / total) * circumference;
      const seg = { label: labels[i], color: colors[i], count, dash, offset: -offset };
      offset += dash;
      return seg;
    }).filter(s => s.count > 0);
  });

  constructor() {
    // Animate balance counter when wallet loads
    effect(() => {
      const balance = this.wallet()?.balance ?? 0;
      this.animateCounter(balance, v => this.displayBalance.set(v));
    });
    // Animate points counter when rewards loads
    effect(() => {
      const pts = this.rewards()?.availablePoints ?? 0;
      this.animateCounter(pts, v => this.displayPoints.set(v));
    });
  }

  private animateCounter(target: number, setter: (v: number) => void, duration = 900): void {
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setter(Math.round(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

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
      next: p => {
        this.userProfile.set(p);
        this.kycStatus.set(p.kycStatus ?? 'NotSubmitted');
        this.loadingProfile.set(false);
      },
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
    this.profileSvc.getProfile().subscribe({
      next: p => {
        this.userProfile.set(p);
        this.kycStatus.set(p.kycStatus ?? 'NotSubmitted');
      },
      error: () => {}
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
