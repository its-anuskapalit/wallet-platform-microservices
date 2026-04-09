import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TransactionService } from '../../core/services/transaction.service';
import { WalletService } from '../../core/services/wallet.service';
import { ProfileService } from '../../core/services/profile.service';
import { ReceiptService } from '../../core/services/receipt.service';
import { Transaction } from '../../core/models/transaction.models';
import { UserProfile } from '../../core/models/profile.models';
import { Wallet } from '../../core/models/wallet.models';

type SendStep = 'email' | 'confirm';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, ReactiveFormsModule],
  template: `
    <div class="transactions-page page-enter">
      <div class="page-header">
        <div>
          <p class="label-sm text-muted">FINANCE</p>
          <h1 class="headline-lg">Transactions</h1>
        </div>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-secondary" (click)="exportCsv()" [disabled]="filteredTxns().length === 0">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M7.5 1v9M4 7l3.5 3.5L11 7"/><path d="M2 12h11"/></svg>
            Export CSV
          </button>
          <button class="btn btn-primary" (click)="openSendModal()">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M14 2L2 6l5 3 3 5 4-12z"/></svg>
            Send Money
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filter-bar">
        @for (f of filters; track f.value) {
          <button class="filter-btn" [class.active]="activeFilter() === f.value" (click)="activeFilter.set(f.value)">
            {{ f.label }}
          </button>
        }
        <div class="filter-spacer"></div>
        <span class="label-sm text-muted">{{ filteredTxns().length }} records</span>
      </div>

      <!-- Table -->
      <div class="card table-card">
        @if (loading()) {
          @for (i of [1,2,3,4,5]; track i) {
            <div class="table-row skeleton-row">
              <div class="skeleton" style="width:36px;height:36px;border-radius:10px;"></div>
              <div style="flex:1"><div class="skeleton" style="height:13px;width:50%;"></div></div>
              <div class="skeleton" style="height:13px;width:80px;"></div>
              <div class="skeleton" style="height:13px;width:100px;"></div>
              <div class="skeleton" style="height:22px;width:70px;border-radius:20px;"></div>
            </div>
          }
        } @else if (filteredTxns().length === 0) {
          <div class="empty-state">
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="var(--outline-variant)" stroke-width="1.5"><rect x="8" y="14" width="40" height="28" rx="4"/><path d="M8 22h40"/></svg>
            <p class="title-sm">No transactions found</p>
            <p class="body-sm text-muted">Transactions will appear here once you send or receive funds.</p>
          </div>
        } @else {
          <div class="table-header">
            <span></span><span>Transaction</span><span>Amount</span><span>Date</span><span>Status</span><span></span>
          </div>
          @for (txn of filteredTxns(); track txn.id) {
            <div class="table-row" (click)="selectedTxn.set(txn)" style="cursor:pointer;">
              <div class="txn-type-icon" [class]="txnIconClass(txn)">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                  @if (txn.type === 'TopUp') { <path d="M8 3v10M3 8h10"/> }
                  @else { <path d="M14 2L2 6l5 3 3 5 4-12z"/> }
                </svg>
              </div>
              <div class="txn-meta">
                <span class="title-sm">{{ txnLabel(txn) }}</span>
                <span class="label-sm text-muted">Ref: {{ txn.id | slice:0:8 }}…</span>
              </div>
              <div class="txn-amount" [class]="amountClass(txn)">
                {{ isCredit(txn) ? '+' : '-' }}{{ txn.amount | currency:txn.currency }}
              </div>
              <div class="label-md text-muted">{{ txn.createdAt | date:'MMM d, yyyy' }}</div>
              <span class="badge" [class]="statusClass(txn.status)">{{ txn.status }}</span>
              <button class="btn-pdf" title="Download PDF Receipt"
                      [disabled]="downloadingPdfId() === txn.id"
                      (click)="$event.stopPropagation(); downloadPdf(txn)">
                @if (downloadingPdfId() === txn.id) {
                  <span class="spinner-sm"></span>
                } @else {
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M7 1v8M4 6l3 3 3-3"/><path d="M2 11h10"/></svg>
                }
              </button>
            </div>
          }
        }
      </div>

      @if (successMsg()) {
        <div class="alert-success" style="margin-top:16px;">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M13 4l-7 7-3-3"/></svg>
          {{ successMsg() }}
        </div>
      }
    </div>

    <!-- ══ Send Money Modal ══ -->
    @if (showSendModal()) {
      <div class="modal-overlay" (click)="closeSendModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3 class="title-lg">Send Money</h3>
              <p class="label-sm text-muted" style="margin-top:2px;">
                {{ sendStep() === 'email' ? 'Enter recipient email' : 'Confirm transfer' }}
              </p>
            </div>
            <button class="modal-close" (click)="closeSendModal()">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M15 5L5 15M5 5l10 10"/></svg>
            </button>
          </div>

          <!-- Step 1: Enter email -->
          @if (sendStep() === 'email') {
            <form [formGroup]="emailForm" (ngSubmit)="onLookupRecipient()">
              <div class="form-group">
                <label>Recipient's Email Address</label>
                <div class="email-lookup-row">
                  <input
                    type="email"
                    class="form-control"
                    formControlName="email"
                    placeholder="e.g. john@example.com"
                    [class.error]="emailForm.get('email')?.invalid && emailForm.get('email')?.touched"
                  />
                  <button type="submit" class="btn btn-secondary" [disabled]="resolvingRecipient()">
                    @if (resolvingRecipient()) { <span class="spinner-sm spinner-dark"></span> } @else {
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="5"/><path d="M13 13l-3-3"/></svg>
                    }
                    Find
                  </button>
                </div>
                @if (recipientError()) {
                  <p class="field-error" style="margin-top:8px;">{{ recipientError() }}</p>
                }
              </div>

              <!-- Recipient preview card -->
              @if (resolvedRecipient()) {
                <div class="recipient-card">
                  <div class="rc-avatar">{{ recipientInitials() }}</div>
                  <div class="rc-info">
                    <p class="title-sm">{{ resolvedRecipient()!.fullName }}</p>
                    <p class="label-sm text-muted">{{ resolvedRecipient()!.email }}</p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round"><path d="M15 5L7 13l-4-4"/></svg>
                </div>

                <div class="form-group" style="margin-top:16px;">
                  <label>Amount ({{ senderWallet()?.currency ?? 'INR' }})</label>
                  <div class="amount-input-wrap">
                    <span class="currency-prefix">{{ senderWallet()?.currency ?? 'INR' }}</span>
                    <input
                      type="number"
                      class="form-control amount-input"
                      [formControl]="amountForm.controls.amount"
                      placeholder="0.00"
                      min="0.01"
                      step="0.01"
                    />
                  </div>
                  @if (amountForm.get('amount')?.invalid && amountForm.get('amount')?.touched) {
                    <span class="field-error">Enter a valid amount</span>
                  }
                  <p class="label-sm text-muted" style="margin-top:6px;">
                    Available: {{ senderWallet()?.balance | currency:senderWallet()?.currency }}
                  </p>
                </div>

                @if (amountForm.get('amount')?.value && +amountForm.get('amount')!.value! > 0) {
                  <div class="transfer-summary">
                    <div class="ts-row">
                      <span class="label-md text-muted">Sending to</span>
                      <span class="title-sm">{{ resolvedRecipient()!.fullName }}</span>
                    </div>
                    <div class="ts-row">
                      <span class="label-md text-muted">Amount</span>
                      <span class="title-sm amount-positive">{{ amountForm.get('amount')?.value | currency:senderWallet()?.currency }}</span>
                    </div>
                  </div>
                }
              }

              @if (resolvedRecipient()) {
                <div class="modal-actions">
                  <button type="button" class="btn btn-secondary" (click)="closeSendModal()">Cancel</button>
                  <button type="button" class="btn btn-primary" (click)="onConfirmSend()" [disabled]="submitting() || amountForm.invalid">
                    @if (submitting()) { <span class="spinner-sm"></span> }
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M14 2L2 6l5 3 3 5 4-12z"/></svg>
                    Send Money
                  </button>
                </div>
              }
            </form>

            @if (sendError()) {
              <div class="alert-error" style="margin-top:14px;">{{ sendError() }}</div>
            }
          }
        </div>
      </div>
    }

    <!-- ══ Transaction Detail Modal ══ -->
    @if (selectedTxn()) {
      <div class="modal-overlay" (click)="selectedTxn.set(null)">
        <div class="modal modal--detail" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="title-lg">Transaction Detail</h3>
            <button class="modal-close" (click)="selectedTxn.set(null)">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M15 5L5 15M5 5l10 10"/></svg>
            </button>
          </div>

          <div class="detail-amount" [class]="amountClass(selectedTxn()!)">
            {{ isCredit(selectedTxn()!) ? '+' : '-' }}{{ selectedTxn()!.amount | currency:selectedTxn()!.currency }}
          </div>

          <div class="detail-rows">
            <div class="detail-row">
              <span class="text-muted label-md">Type</span>
              <span class="title-sm">{{ txnLabel(selectedTxn()!) }}</span>
            </div>
            <div class="detail-row">
              <span class="text-muted label-md">Status</span>
              <span class="badge" [class]="statusClass(selectedTxn()!.status)">{{ selectedTxn()!.status }}</span>
            </div>
            <div class="detail-row">
              <span class="text-muted label-md">Currency</span>
              <span class="title-sm">{{ selectedTxn()!.currency }}</span>
            </div>
            <div class="detail-row">
              <span class="text-muted label-md">Date</span>
              <span class="title-sm">{{ selectedTxn()!.createdAt | date:'MMM d, yyyy h:mm a' }}</span>
            </div>
            <div class="detail-row">
              <span class="text-muted label-md">Reference ID</span>
              <span class="mono-text">{{ selectedTxn()!.id }}</span>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .transactions-page { max-width: 1000px; }

    .page-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-bottom: 24px;
      h1 { margin-top: 4px; }
    }

    .filter-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .filter-btn {
      padding: 7px 16px;
      border: none;
      background: var(--surface-container-low);
      border-radius: var(--radius-full);
      font-size: 13px;
      font-weight: 500;
      color: var(--on-surface-variant);
      cursor: pointer;
      transition: all 0.15s;

      &.active { background: var(--primary-fixed); color: var(--primary); font-weight: 600; }
      &:hover:not(.active) { background: var(--surface-container); }
    }

    .filter-spacer { flex: 1; }

    .table-card { padding: 0; overflow: hidden; }

    .table-header {
      display: grid;
      grid-template-columns: 36px 1fr auto auto auto 30px;
      gap: 16px;
      padding: 12px 20px;
      background: var(--surface-container-low);
      font-size: 12px;
      font-weight: 600;
      color: var(--on-surface-variant);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .table-row {
      display: grid;
      grid-template-columns: 36px 1fr auto auto auto 30px;
      gap: 16px;
      align-items: center;
      padding: 14px 20px;
      transition: background 0.15s;

      &:not(.skeleton-row):hover { background: var(--surface-container-low); }
    }

    .skeleton-row { padding: 14px 20px; }

    .txn-type-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      &.credit  { background: var(--success-container); color: var(--success); }
      &.debit   { background: var(--error-container); color: var(--error); }
      &.neutral { background: var(--surface-container); color: var(--on-surface-variant); }
    }

    .txn-meta { display: flex; flex-direction: column; gap: 2px; }

    .txn-amount { font-weight: 700; font-size: 14px; white-space: nowrap; }
    .txn-amount.amount-positive { color: var(--success); }
    .txn-amount.amount-negative { color: var(--error); }
    .amount-positive { color: var(--success); }
    .amount-negative { color: var(--error); }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 60px 20px;
    }

    // ── Modals ──────────────────────────────────────────────────────────────
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(28,28,25,0.5);
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
      max-width: 460px;
      box-shadow: var(--shadow-float);

      &--detail { max-width: 500px; }
    }

    .modal-header {
      display: flex;
      align-items: flex-start;
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
      flex-shrink: 0;
      &:hover { background: var(--surface-container); }
    }

    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
    }

    // ── Email lookup ────────────────────────────────────────────────────────
    .email-lookup-row {
      display: flex;
      gap: 10px;
      .form-control { flex: 1; }
    }

    // ── Recipient preview card ──────────────────────────────────────────────
    .recipient-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      background: var(--success-container);
      border-radius: var(--radius-md);
      margin-top: 14px;
    }

    .rc-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--success);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-display);
      font-size: 15px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .rc-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }

    // ── Amount input ────────────────────────────────────────────────────────
    .amount-input-wrap {
      display: flex;
      align-items: center;
      border: 1.5px solid var(--outline-variant);
      border-radius: var(--radius-md);
      overflow: hidden;
      background: var(--surface-container-lowest);
      transition: border-color 0.15s;

      &:focus-within { border-color: var(--primary); }
    }

    .currency-prefix {
      padding: 12px 14px;
      background: var(--surface-container-low);
      font-size: 13px;
      font-weight: 600;
      color: var(--on-surface-variant);
      border-right: 1.5px solid var(--outline-variant);
    }

    .amount-input {
      border: none !important;
      border-radius: 0 !important;
      flex: 1;

      &:focus { outline: none; box-shadow: none; }
    }

    // ── Transfer summary ────────────────────────────────────────────────────
    .transfer-summary {
      margin-top: 16px;
      padding: 14px 16px;
      background: var(--surface-container-low);
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .ts-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    // ── Detail modal ────────────────────────────────────────────────────────
    .detail-amount {
      font-family: var(--font-display);
      font-size: 2.5rem;
      font-weight: 800;
      text-align: center;
      padding: 24px 0;
      letter-spacing: -0.02em;
    }

    .detail-rows { display: flex; flex-direction: column; }

    .detail-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 0;

      & + & { border-top: 1px solid rgba(200,197,192,0.3); }
    }

    .mono-text {
      font-family: monospace;
      font-size: 11px;
      color: var(--on-surface-variant);
      word-break: break-all;
      text-align: right;
      max-width: 240px;
    }

    // ── Alerts ──────────────────────────────────────────────────────────────
    .alert-success, .alert-error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 16px;
      border-radius: var(--radius-md);
      font-size: 14px;
    }
    .alert-success { background: var(--success-container); color: var(--success); }
    .alert-error   { background: var(--error-container);   color: var(--error); }

    .btn-pdf {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border: 1px solid var(--outline-variant);
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--on-surface-variant);
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;

      &:hover:not(:disabled) {
        background: var(--surface-container);
        color: var(--primary);
        border-color: var(--primary);
      }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    .spinner-sm {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(0,0,0,0.15);
      border-top-color: var(--primary);
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
export class TransactionsComponent implements OnInit {
  private txnSvc      = inject(TransactionService);
  private walletSvc   = inject(WalletService);
  private profileSvc  = inject(ProfileService);
  private receiptSvc  = inject(ReceiptService);
  private fb          = inject(FormBuilder);

  transactions    = signal<Transaction[]>([]);
  loading         = signal(true);
  activeFilter    = signal<string>('all');
  downloadingPdfId = signal<string | null>(null);

  showSendModal       = signal(false);
  sendStep            = signal<SendStep>('email');
  resolvingRecipient  = signal(false);
  resolvedRecipient   = signal<UserProfile | null>(null);
  resolvedRecipientWallet = signal<Wallet | null>(null);
  recipientError      = signal<string | null>(null);
  submitting          = signal(false);
  sendError           = signal<string | null>(null);
  successMsg          = signal<string | null>(null);
  selectedTxn         = signal<Transaction | null>(null);
  senderWallet        = signal<Wallet | null>(null);

  recipientInitials = () => {
    const name = this.resolvedRecipient()?.fullName ?? '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  };

  filters = [
    { label: 'All',       value: 'all' },
    { label: 'Completed', value: 'Completed' },
    { label: 'Pending',   value: 'Pending' },
    { label: 'Failed',    value: 'Failed' }
  ];

  filteredTxns = computed(() => {
    const f = this.activeFilter();
    if (f === 'all') return this.transactions();
    return this.transactions().filter(t => t.status === f);
  });

  emailForm  = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
  amountForm = this.fb.group({ amount: [null as number | null, [Validators.required, Validators.min(0.01)]] });

  ngOnInit(): void {
    this.walletSvc.getWallet().subscribe(w => this.senderWallet.set(w));
    this.txnSvc.getMyTransactions().subscribe({
      next: t => { this.transactions.set(t); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openSendModal(): void {
    this.showSendModal.set(true);
    this.sendStep.set('email');
    this.resolvedRecipient.set(null);
    this.resolvedRecipientWallet.set(null);
    this.recipientError.set(null);
    this.sendError.set(null);
    this.emailForm.reset();
    this.amountForm.reset();
  }

  closeSendModal(): void {
    this.showSendModal.set(false);
  }

  onLookupRecipient(): void {
    if (this.emailForm.invalid) { this.emailForm.markAllAsTouched(); return; }
    const email = this.emailForm.value.email!.trim();

    this.resolvingRecipient.set(true);
    this.recipientError.set(null);
    this.resolvedRecipient.set(null);

    this.profileSvc.lookupByEmail(email).subscribe({
      next: profile => {
        // Now fetch their wallet
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

  onConfirmSend(): void {
    if (this.amountForm.invalid) { this.amountForm.markAllAsTouched(); return; }
    const recipient = this.resolvedRecipient();
    const recipientWallet = this.resolvedRecipientWallet();
    const sender = this.senderWallet();
    if (!recipient || !recipientWallet || !sender) return;

    this.submitting.set(true);
    this.sendError.set(null);

    this.txnSvc.initiate({
      senderWalletId:  sender.id,
      receiverWalletId: recipientWallet.id,
      receiverUserId:  recipient.userId,
      amount:          this.amountForm.value.amount!,
      currency:        sender.currency,
      type:            'Transfer',
      idempotencyKey:  crypto.randomUUID()
    }).subscribe({
      next: txn => {
        this.transactions.update(list => [txn, ...list]);
        this.submitting.set(false);
        this.closeSendModal();
        this.successMsg.set(`₹${this.amountForm.value.amount} sent to ${recipient.fullName} successfully.`);
        // Refresh wallet balance
        this.walletSvc.getWallet().subscribe(w => this.senderWallet.set(w));
      },
      error: err => {
        this.sendError.set(err.error?.error ?? 'Transfer failed. Please try again.');
        this.submitting.set(false);
      }
    });
  }

  txnLabel(txn: Transaction): string {
    if (txn.type === 'TopUp')     return 'Top Up';
    if (txn.type === 'Deduction') return 'Deduction';
    return 'Transfer';
  }

  isCredit(txn: Transaction): boolean {
    if (txn.type === 'TopUp') return true;
    if (txn.type === 'Transfer') {
      return txn.receiverWalletId === this.senderWallet()?.id;
    }
    return false;
  }

  txnIconClass(txn: Transaction): string {
    return this.isCredit(txn) ? 'txn-type-icon credit' : 'txn-type-icon debit';
  }

  amountClass(txn: Transaction): string {
    return this.isCredit(txn) ? 'txn-amount amount-positive' : 'txn-amount amount-negative';
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      Completed: 'badge badge-success',
      Failed:    'badge badge-error',
      Pending:   'badge badge-warning'
    };
    return map[status] ?? 'badge badge-neutral';
  }

  downloadPdf(txn: Transaction): void {
    this.downloadingPdfId.set(txn.id);
    this.receiptSvc.downloadPdf(txn.id).subscribe({
      next: (blob) => {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = `receipt-${txn.id.slice(0, 8)}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
        this.downloadingPdfId.set(null);
      },
      error: () => {
        this.downloadingPdfId.set(null);
        // Receipt may not be generated yet for very recent transactions
        alert('Receipt not available yet for this transaction.');
      }
    });
  }

  exportCsv(): void {
    const rows = this.filteredTxns();
    if (rows.length === 0) return;

    const header = ['Date', 'Type', 'Amount', 'Currency', 'Status', 'Transaction ID'];
    const lines  = rows.map(t => [
      new Date(t.createdAt).toLocaleString(),
      t.type,
      t.amount,
      t.currency,
      t.status,
      t.id
    ].map(v => `"${v}"`).join(','));

    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
