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
  template: `
    <div class="dashboard page-enter">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <p class="label-sm text-muted">{{ greeting() }}</p>
          <h1 class="headline-lg">{{ displayName() }}</h1>
        </div>
        <div class="header-actions">
          <a routerLink="/wallet" class="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>
            Add Funds
          </a>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions-row">
        <a routerLink="/wallet" class="qa-btn">
          <span class="qa-icon qa-icon--topup">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M10 4v12M4 10h12"/></svg>
          </span>
          <span class="qa-label">Top Up</span>
        </a>
        <a routerLink="/wallet" class="qa-btn">
          <span class="qa-icon qa-icon--send">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h14M11 4l6 6-6 6"/></svg>
          </span>
          <span class="qa-label">Send</span>
        </a>
        <a routerLink="/transactions" class="qa-btn">
          <span class="qa-icon qa-icon--history">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="10" cy="10" r="8"/><path d="M10 6v4l2.5 2.5"/></svg>
          </span>
          <span class="qa-label">History</span>
        </a>
        <a routerLink="/rewards" class="qa-btn">
          <span class="qa-icon qa-icon--rewards">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2l2.39 4.84L18 7.64l-4 3.9.94 5.46L10 14.27 5.06 17l.94-5.46-4-3.9 5.61-.8z"/></svg>
          </span>
          <span class="qa-label">Rewards</span>
        </a>
        <a routerLink="/profile" class="qa-btn">
          <span class="qa-icon qa-icon--profile">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="10" cy="7" r="3"/><path d="M4 17c0-3.31 2.69-6 6-6s6 2.69 6 6"/></svg>
          </span>
          <span class="qa-label">Profile</span>
        </a>
      </div>

      <!-- Stats Row -->
      <div class="stats-grid">
        <!-- Balance Card -->
        <div class="stat-card stat-card--primary">
          <div class="stat-header">
            <span class="stat-label">{{ nicknameSvc.nickname() || 'Total Balance' }}</span>
            <div class="stat-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="4" width="16" height="12" rx="2"/><path d="M2 8h16"/><circle cx="14" cy="13" r="1.5" fill="currentColor" stroke="none"/></svg>
            </div>
          </div>
          @if (loadingWallet()) {
            <div class="skeleton" style="height: 40px; width: 180px; margin: 8px 0;"></div>
          } @else {
            <div class="stat-value-row">
              <div class="stat-balance-slot">
                @if (balanceVis.visible()) {
                  <div class="stat-value counter-animate">{{ displayBalance() | currency:wallet()?.currency ?? 'INR' }}</div>
                } @else {
                  <div class="stat-value balance-masked">{{ balanceVis.maskedAmount(wallet()?.currency) }}</div>
                }
              </div>
              <button
                type="button"
                class="balance-visibility-btn"
                (click)="balanceVis.toggle()"
                [attr.aria-label]="balanceVis.visible() ? 'Hide balance' : 'Show balance'"
                [attr.aria-pressed]="!balanceVis.visible()">
                @if (balanceVis.visible()) {
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1 4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                } @else {
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                }
              </button>
            </div>
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
            <div class="stat-value counter-animate">{{ displayPoints() | number }}</div>
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

        <!-- Quick Actions + Spending Chart -->
        <div class="quick-actions-panel">
          <!-- Spending Breakdown -->
          @if (!loadingTxns() && spendingData().total > 0) {
            <div class="card spending-card">
              <h3 class="title-md" style="margin-bottom:16px;">Spending Breakdown</h3>
              <div class="donut-wrap">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  @for (seg of donutSegments(); track seg.label; let i = $index) {
                    <circle
                      cx="60" cy="60" r="46"
                      fill="none"
                      [attr.stroke]="seg.color"
                      stroke-width="20"
                      [attr.stroke-dasharray]="seg.dash + ' ' + (289 - seg.dash)"
                      [attr.stroke-dashoffset]="seg.offset"
                      transform="rotate(-90 60 60)"
                      style="transition: stroke-dasharray 0.8s ease;"
                    />
                  }
                  <circle cx="60" cy="60" r="34" fill="var(--surface-container-lowest)"/>
                  <text x="60" y="56" text-anchor="middle" font-size="11" font-weight="700" fill="var(--on-surface-variant)">Total</text>
                  <text x="60" y="70" text-anchor="middle" font-size="13" font-weight="800" fill="var(--on-surface)">{{ spendingData().total }}</text>
                </svg>
                <div class="donut-legend">
                  @for (seg of donutSegments(); track seg.label) {
                    <div class="legend-item">
                      <span class="legend-dot" [style.background]="seg.color"></span>
                      <span class="legend-label">{{ seg.label }}</span>
                      <span class="legend-val">{{ seg.count }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          }

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
      margin-bottom: 24px;

      h1 { margin-top: 4px; }
    }

    .header-actions { display: flex; gap: 12px; }

    /* ── Quick Actions Row ── */
    .quick-actions-row {
      display: flex;
      gap: 12px;
      margin-bottom: 28px;
      overflow-x: auto;
      padding-bottom: 2px;
    }

    .qa-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px 20px;
      border-radius: var(--radius-lg);
      background: var(--surface-container-lowest);
      border: 1px solid var(--outline-variant);
      text-decoration: none;
      color: var(--on-surface-variant);
      cursor: pointer;
      transition: all 0.18s ease;
      flex: 1;
      min-width: 80px;
      white-space: nowrap;

      &:hover {
        background: var(--primary-fixed);
        border-color: var(--primary);
        color: var(--primary);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(148, 74, 0, 0.15);

        .qa-icon { background: var(--primary); color: white; }
      }
    }

    .qa-icon {
      width: 44px;
      height: 44px;
      border-radius: 14px;
      background: var(--surface-container-low);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.18s ease;

      &--topup  { background: #fff3e0; color: #e65100; }
      &--send   { background: #e8f5e9; color: #2e7d32; }
      &--history { background: #e3f2fd; color: #1565c0; }
      &--rewards { background: #fff8e1; color: #f57f17; }
      &--profile { background: #f3e5f5; color: #6a1b9a; }
    }

    .qa-label {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

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

    .stat-value-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: nowrap;
      margin-bottom: 8px;
      min-height: 48px;
    }

    .stat-balance-slot {
      flex: 1;
      min-width: 0;
      min-height: 48px;
      display: flex;
      align-items: center;
    }

    .stat-value {
      font-family: var(--font-display);
      font-size: 2rem;
      font-weight: 700;
      line-height: 1.1;
      margin-bottom: 0;

      &--sm { font-size: 1.4rem; }
    }

    .balance-masked {
      letter-spacing: 0.1em;
      user-select: none;
    }

    .balance-visibility-btn {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s ease, transform 0.15s ease;
    }

    .stat-card--primary .balance-visibility-btn {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    .stat-card--primary .balance-visibility-btn:hover {
      background: rgba(255, 255, 255, 0.32);
    }

    .stat-card--primary .balance-visibility-btn:focus-visible {
      outline: 2px solid rgba(255, 255, 255, 0.9);
      outline-offset: 2px;
    }

    @media (max-width: 380px) {
      .stat-value-row { flex-wrap: wrap; }
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

    /* Spending chart */
    .spending-card { margin-bottom: 16px; }

    .donut-wrap {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .donut-legend {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .legend-label {
      flex: 1;
      color: var(--on-surface-variant);
      font-weight: 500;
    }

    .legend-val {
      font-weight: 700;
      color: var(--on-surface);
    }

    /* Animated counter */
    .counter-animate {
      animation: countUp 0.4s ease-out;
    }

    @keyframes countUp {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
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
