import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { WalletService } from '../../core/services/wallet.service';
import { ProfileService } from '../../core/services/profile.service';
import { TransactionService } from '../../core/services/transaction.service';
import { WalletNicknameService } from '../../core/services/wallet-nickname.service';
import { BalanceVisibilityService } from '../../core/services/balance-visibility.service';
import { ToastService } from '../../core/services/toast.service';
import { ClipboardService } from '../../core/services/clipboard.service';
import { Wallet } from '../../core/models/wallet.models';
import { UserProfile } from '../../core/models/profile.models';

type ModalType = 'topup' | 'send' | null;

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, ReactiveFormsModule],
  template: `
    <div class="wallet-page page-enter">
      <div class="page-header">
        <div>
          <p class="label-sm text-muted">MY WALLET</p>
          <h1 class="headline-lg">Wallet</h1>
        </div>
      </div>

      <!-- Wallet Card -->
      @if (loadingWallet()) {
        <div class="skeleton" style="height: 200px; border-radius: 24px; margin-bottom: 28px;"></div>
      } @else if (wallet()) {
        <div class="wallet-hero" [class.frozen]="wallet()!.isFrozen">
          <!-- Nickname row -->
          <div class="wallet-nickname-row">
            @if (editingNickname()) {
              <input
                #nicknameInput
                class="nickname-input"
                [value]="nicknameSvc.nickname()"
                placeholder="e.g. My Business Wallet"
                maxlength="40"
                (keyup.enter)="saveNickname(nicknameInput.value)"
                (keyup.escape)="editingNickname.set(false)"
                (blur)="saveNickname(nicknameInput.value)"
                autofocus
              />
            } @else {
              <span class="nickname-display" (click)="startEditNickname()">
                {{ nicknameSvc.nickname() || 'Personal Wallet' }}
                <svg class="edit-pencil" width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2l2 2L4 11H2V9L9 2z"/></svg>
              </span>
            }
          </div>

          <div class="wallet-hero-top">
            <div>
              <p class="wallet-hero-label">Available Balance</p>
              <div class="wallet-hero-balance-row">
                <div class="wallet-hero-balance-slot">
                  @if (balanceVis.visible()) {
                    <div class="wallet-hero-balance">{{ wallet()!.balance | currency:wallet()!.currency }}</div>
                  } @else {
                    <div class="wallet-hero-balance balance-masked">{{ balanceVis.maskedAmount(wallet()!.currency) }}</div>
                  }
                </div>
                <button
                  type="button"
                  class="balance-visibility-btn-hero"
                  (click)="balanceVis.toggle()"
                  [attr.aria-label]="balanceVis.visible() ? 'Hide balance' : 'Show balance'"
                  [attr.aria-pressed]="!balanceVis.visible()">
                  @if (balanceVis.visible()) {
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1 4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  } @else {
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  }
                </button>
              </div>
            </div>
            <div class="wallet-chip">
              <svg width="36" height="28" viewBox="0 0 36 28" fill="none">
                <rect x="1" y="1" width="34" height="26" rx="4" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
                <rect x="6" y="8" width="8" height="12" rx="1" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>
                <path d="M14 8v12" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
              </svg>
            </div>
          </div>
          <div class="wallet-hero-bottom">
            <div class="wallet-id">
              <p class="wallet-label-sm">Wallet ID</p>
              <div class="wallet-id-row">
                <p class="wallet-id-value">•••• •••• {{ shortId(wallet()!.id) }}</p>
                <button
                  type="button"
                  class="copy-id-btn"
                  (click)="copyWalletId(wallet()!.id)"
                  title="Copy full wallet ID"
                  aria-label="Copy full wallet ID">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2"/>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                  </svg>
                </button>
              </div>
            </div>
            @if (wallet()!.isFrozen) {
              <div class="frozen-badge">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="6" width="8" height="7" rx="1"/><path d="M5 6V4.5a2 2 0 014 0V6"/></svg>
                Frozen
              </div>
            } @else {
              <div class="currency-tag">{{ wallet()!.currency }}</div>
            }
          </div>
        </div>
      }

      <!-- Action Buttons -->
      <div class="wallet-actions">
        <button class="btn btn-primary" (click)="openModal('topup')">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>
          Top Up
        </button>
        <button class="btn btn-secondary" (click)="openModal('send')">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M14 2L2 6l5 3 3 5 4-12z"/></svg>
          Send
        </button>
      </div>

      <!-- Wallet Info Cards -->
      <div class="info-grid">
        <div class="card">
          <div class="info-item">
            <div class="info-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="8"/><path d="M10 6v4l3 3"/></svg>
            </div>
            <div>
              <p class="label-sm text-muted">CREATED</p>
              <p class="title-sm">{{ wallet()?.createdAt | date:'MMM d, yyyy' }}</p>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="info-item">
            <div class="info-icon info-icon--green">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 10.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5"/><path d="M19 7H1l9-5 9 5z"/></svg>
            </div>
            <div>
              <p class="label-sm text-muted">STATUS</p>
              <p class="title-sm">{{ wallet()?.isFrozen ? 'Frozen' : 'Active' }}</p>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="info-item">
            <div class="info-icon info-icon--gold">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2C5.58 2 2 5.58 2 10s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8z"/><path d="M10 6v4M10 14h.01"/></svg>
            </div>
            <div>
              <p class="label-sm text-muted">CURRENCY</p>
              <p class="title-sm">{{ wallet()?.currency ?? 'USD' }}</p>
            </div>
          </div>
        </div>
      </div>

      @if (errorMsg()) {
        <div class="alert-error">{{ errorMsg() }}</div>
      }
    </div>

    <!-- Modal Overlay -->
    @if (activeModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="title-lg">{{ activeModal() === 'topup' ? 'Top Up Wallet' : 'Send Money' }}</h3>
            <button class="modal-close" (click)="closeModal()">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M15 5L5 15M5 5l10 10"/></svg>
            </button>
          </div>

          <!-- TOP UP form -->
          @if (activeModal() === 'topup') {
            <form [formGroup]="topUpForm" (ngSubmit)="onTopUp()">
              <div class="form-group">
                <label>Amount ({{ wallet()?.currency ?? 'INR' }})</label>
                <input type="number" class="form-control" formControlName="amount" placeholder="0.00" min="0.01" step="0.01"/>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary" [disabled]="submitting()">
                  @if (submitting()) { <span class="spinner-sm"></span> }
                  Add Funds
                </button>
              </div>
            </form>
          }

          <!-- SEND form — email-based -->
          @if (activeModal() === 'send') {
            <div>
              <div class="form-group">
                <label>Recipient Email</label>
                <div style="display:flex;gap:10px;">
                  <input type="email" class="form-control" [formControl]="sendForm.controls.email"
                         placeholder="recipient@example.com" style="flex:1;"/>
                  <button type="button" class="btn btn-secondary" (click)="onLookupSendRecipient()" [disabled]="resolvingRecipient()">
                    @if (resolvingRecipient()) { <span class="spinner-sm spinner-dark"></span> } @else { Find }
                  </button>
                </div>
                @if (recipientError()) {
                  <p class="field-error" style="margin-top:8px;">{{ recipientError() }}</p>
                }
              </div>

              @if (resolvedRecipient()) {
                <div class="recipient-card">
                  <div class="rc-avatar">{{ recipientInitials() }}</div>
                  <div style="flex:1;">
                    <p class="title-sm">{{ resolvedRecipient()!.fullName }}</p>
                    <p class="label-sm text-muted">{{ resolvedRecipient()!.email }}</p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round"><path d="M15 5L7 13l-4-4"/></svg>
                </div>

                <div class="form-group" style="margin-top:16px;">
                  <label>Amount ({{ wallet()?.currency ?? 'INR' }})</label>
                  <input type="number" class="form-control" [formControl]="sendForm.controls.amount"
                         placeholder="0.00" min="0.01" step="0.01"/>
                  <p class="label-sm text-muted" style="margin-top:6px;">
                    Balance:
                    @if (balanceVis.visible()) {
                      {{ wallet()?.balance | currency:wallet()?.currency }}
                    } @else {
                      <span class="balance-masked-inline">{{ balanceVis.maskedAmount(wallet()?.currency) }}</span>
                    }
                  </p>
                </div>
              }

              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancel</button>
                @if (resolvedRecipient()) {
                  <button type="button" class="btn btn-primary" (click)="onSend()" [disabled]="submitting() || sendForm.controls.amount.invalid">
                    @if (submitting()) { <span class="spinner-sm"></span> }
                    Send Money
                  </button>
                }
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .wallet-page { max-width: 800px; }

    .page-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-bottom: 28px;
      h1 { margin-top: 4px; }
    }

    /* ── Wallet Nickname ── */
    .wallet-nickname-row {
      margin-bottom: 16px;
    }

    .nickname-display {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: rgba(255,255,255,0.85);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      cursor: pointer;
      border-bottom: 1px dashed rgba(255,255,255,0.35);
      padding-bottom: 1px;
      transition: color 0.15s;

      &:hover { color: white; .edit-pencil { opacity: 1; } }
    }

    .edit-pencil { opacity: 0.55; transition: opacity 0.15s; }

    .nickname-input {
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.4);
      border-radius: 8px;
      color: white;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.04em;
      padding: 4px 10px;
      outline: none;
      width: 220px;

      &::placeholder { color: rgba(255,255,255,0.5); }
      &:focus { border-color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.2); }
    }

    .wallet-hero {
      border-radius: var(--radius-xl);
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%);
      padding: 32px;
      color: white;
      margin-bottom: 24px;
      box-shadow: 0 12px 48px rgba(148, 74, 0, 0.3);
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: -40px;
        right: -40px;
        width: 200px;
        height: 200px;
        background: rgba(255,255,255,0.06);
        border-radius: 50%;
      }

      &.frozen {
        background: linear-gradient(135deg, #455a64 0%, #607d8b 100%);
        box-shadow: 0 12px 48px rgba(69, 90, 100, 0.3);
      }
    }

    .wallet-hero-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
    }

    .wallet-hero-label {
      font-size: 13px;
      font-weight: 500;
      color: rgba(255,255,255,0.7);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .wallet-hero-balance-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: nowrap;
      min-height: 3.5rem;
    }

    .wallet-hero-balance-slot {
      flex: 1;
      min-width: 0;
      min-height: 3.5rem;
      display: flex;
      align-items: center;
    }

    .wallet-hero-balance {
      font-family: var(--font-display);
      font-size: 2.75rem;
      font-weight: 800;
      color: white;
      letter-spacing: -0.02em;
    }

    .wallet-hero-balance.balance-masked {
      letter-spacing: 0.08em;
      user-select: none;
    }

    .balance-masked-inline {
      letter-spacing: 0.06em;
      user-select: none;
    }

    .balance-visibility-btn-hero {
      flex-shrink: 0;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.18);
      color: white;
      transition: background 0.15s ease;
    }

    .balance-visibility-btn-hero:hover {
      background: rgba(255, 255, 255, 0.28);
    }

    .balance-visibility-btn-hero:focus-visible {
      outline: 2px solid rgba(255, 255, 255, 0.85);
      outline-offset: 2px;
    }

    .wallet-hero.frozen .balance-visibility-btn-hero {
      background: rgba(255, 255, 255, 0.14);
    }

    .wallet-hero-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .wallet-label-sm {
      font-size: 11px;
      color: rgba(255,255,255,0.6);
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .wallet-id-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .wallet-id-value {
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0.08em;
      margin: 0;
    }

    .copy-id-btn {
      flex-shrink: 0;
      width: 34px;
      height: 34px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.18);
      color: white;
      transition: background 0.15s ease;
    }

    .copy-id-btn:hover {
      background: rgba(255, 255, 255, 0.28);
    }

    .wallet-hero.frozen .copy-id-btn {
      background: rgba(255, 255, 255, 0.12);
    }

    .currency-tag {
      background: rgba(255,255,255,0.2);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.04em;
    }

    .frozen-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.2);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
    }

    .wallet-actions {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 20px;

      @media (max-width: 600px) { grid-template-columns: 1fr; }
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .info-icon {
      width: 44px;
      height: 44px;
      border-radius: 14px;
      background: var(--surface-container-low);
      color: var(--on-surface-variant);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      &--green { background: var(--success-container); color: var(--success); }
      &--gold { background: #fff8e1; color: #f57f17; }
    }

    .alert-success, .alert-error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 16px;
      border-radius: var(--radius-md);
      font-size: 14px;
      margin-top: 16px;
    }

    .alert-success { background: var(--success-container); color: var(--success); }
    .alert-error { background: var(--error-container); color: var(--error); }

    // Modal
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(28, 28, 25, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal {
      background: var(--surface-container-lowest);
      border-radius: var(--radius-xl);
      padding: 32px;
      width: 100%;
      max-width: 420px;
      box-shadow: var(--shadow-float);
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }

    .modal-close {
      width: 36px;
      height: 36px;
      border: none;
      background: var(--surface-container-low);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--on-surface-variant);
      &:hover { background: var(--surface-container); }
    }

    .modal-actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
      justify-content: flex-end;
    }

    .recipient-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--success-container);
      border-radius: var(--radius-md);
      margin-top: 14px;
    }

    .rc-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: var(--success);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-display);
      font-size: 14px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .spinner-sm {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;

      &.spinner-dark {
        border-color: rgba(0,0,0,0.15);
        border-top-color: var(--on-surface);
      }
    }

    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class WalletComponent implements OnInit {
  private walletSvc  = inject(WalletService);
  private profileSvc = inject(ProfileService);
  private txnSvc     = inject(TransactionService);
  private fb         = inject(FormBuilder);
  nicknameSvc        = inject(WalletNicknameService);
  balanceVis         = inject(BalanceVisibilityService);
  private toast      = inject(ToastService);
  private clipboard  = inject(ClipboardService);

  wallet          = signal<Wallet | null>(null);
  loadingWallet   = signal(true);
  activeModal     = signal<ModalType>(null);
  submitting      = signal(false);
  errorMsg        = signal<string | null>(null);
  editingNickname = signal(false);

  startEditNickname(): void { this.editingNickname.set(true); }

  saveNickname(value: string): void {
    this.nicknameSvc.save(value);
    this.editingNickname.set(false);
  }
  topUpIdempotencyKey = '';

  resolvingRecipient      = signal(false);
  resolvedRecipient       = signal<UserProfile | null>(null);
  resolvedRecipientWallet = signal<Wallet | null>(null);
  recipientError          = signal<string | null>(null);

  recipientInitials = () => {
    const name = this.resolvedRecipient()?.fullName ?? '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  };

  topUpForm = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]]
  });
  sendForm = this.fb.group({
    email:  ['', [Validators.required, Validators.email]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]]
  });

  ngOnInit(): void {
    this.loadWallet();
  }

  loadWallet(): void {
    this.loadingWallet.set(true);
    this.walletSvc.getWallet().subscribe({
      next: w => { this.wallet.set(w); this.loadingWallet.set(false); },
      error: () => this.loadingWallet.set(false)
    });
  }

  openModal(type: ModalType): void {
    this.activeModal.set(type);
    this.errorMsg.set(null);
    this.topUpForm.reset();
    this.sendForm.reset();
    this.resolvedRecipient.set(null);
    this.resolvedRecipientWallet.set(null);
    this.recipientError.set(null);
    // Generate idempotency key once per modal open — retries reuse the same key
    this.topUpIdempotencyKey = crypto.randomUUID();
  }

  closeModal(): void {
    this.activeModal.set(null);
  }

  onLookupSendRecipient(): void {
    const email = this.sendForm.value.email?.trim();
    if (!email) { this.sendForm.get('email')?.markAsTouched(); return; }

    this.resolvingRecipient.set(true);
    this.recipientError.set(null);
    this.resolvedRecipient.set(null);

    this.profileSvc.lookupByEmail(email).subscribe({
      next: profile => {
        this.walletSvc.getWalletByUserId(profile.userId).subscribe({
          next: wallet => {
            this.resolvedRecipient.set(profile);
            this.resolvedRecipientWallet.set(wallet);
            this.resolvingRecipient.set(false);
          },
          error: () => {
            this.recipientError.set('This user does not have a wallet yet.');
            this.resolvingRecipient.set(false);
          }
        });
      },
      error: err => {
        this.recipientError.set(err.error?.error ?? 'No user found with that email address.');
        this.resolvingRecipient.set(false);
      }
    });
  }

  onTopUp(): void {
    if (this.topUpForm.invalid) return;
    this.submitting.set(true);
    const amount = this.topUpForm.value.amount!;
    this.walletSvc.topUp({ amount, idempotencyKey: this.topUpIdempotencyKey }).subscribe({
      next: w => {
        this.wallet.set(w);
        this.submitting.set(false);
        this.closeModal();
        this.toast.success(`Added ${w.currency} ${amount} to your wallet.`);
      },
      error: err => {
        this.submitting.set(false);
        this.errorMsg.set(err.error?.error ?? 'Top up failed.');
      }
    });
  }

  onSend(): void {
    const recipient       = this.resolvedRecipient();
    const recipientWallet = this.resolvedRecipientWallet();
    const sender          = this.wallet();
    const amount          = this.sendForm.value.amount;

    if (!recipient || !recipientWallet || !sender || !amount) return;

    this.submitting.set(true);
    this.errorMsg.set(null);

    this.txnSvc.initiate({
      senderWalletId:   sender.id,
      receiverWalletId: recipientWallet.id,
      receiverUserId:   recipient.userId,
      amount:           amount,
      currency:         sender.currency,
      type:             'Transfer',
      idempotencyKey:   crypto.randomUUID()
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeModal();
        this.toast.success(`${sender.currency} ${amount} sent to ${recipient.fullName}.`);
        this.loadWallet();
      },
      error: err => {
        this.submitting.set(false);
        this.errorMsg.set(err.error?.error ?? 'Transfer failed. Please try again.');
      }
    });
  }

  copyWalletId(id: string): void {
    void this.clipboard.copy(id, 'Wallet ID copied');
  }

  shortId(id: string): string {
    return id.slice(-4).toUpperCase();
  }
}
