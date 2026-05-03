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
import { BalanceVisibilityService } from '../../core/services/balance-visibility.service';
import { ToastService } from '../../core/services/toast.service';
import { ClipboardService } from '../../core/services/clipboard.service';

type SendStep = 'email' | 'confirm';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, ReactiveFormsModule],
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.scss']
})
export class TransactionsComponent implements OnInit {
  private txnSvc      = inject(TransactionService);
  private walletSvc   = inject(WalletService);
  private profileSvc  = inject(ProfileService);
  private receiptSvc  = inject(ReceiptService);
  private fb          = inject(FormBuilder);
  balanceVis          = inject(BalanceVisibilityService);
  private toast       = inject(ToastService);
  private clipboard   = inject(ClipboardService);

  transactions     = signal<Transaction[]>([]);
  loading          = signal(true);
  activeFilter     = signal<string>('all');
  searchQuery      = signal('');
  dateFrom         = signal('');
  dateTo           = signal('');
  downloadingPdfId = signal<string | null>(null);

  showSendModal       = signal(false);
  sendStep            = signal<SendStep>('email');
  resolvingRecipient  = signal(false);
  resolvedRecipient   = signal<UserProfile | null>(null);
  resolvedRecipientWallet = signal<Wallet | null>(null);
  recipientError      = signal<string | null>(null);
  submitting          = signal(false);
  sendError           = signal<string | null>(null);
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
    let txns = this.transactions();
    const f = this.activeFilter();
    if (f !== 'all') txns = txns.filter(t => t.status === f);
    const q = this.searchQuery().trim().toLowerCase();
    if (q) txns = txns.filter(t =>
      t.type.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      (t.amount?.toString() ?? '').includes(q)
    );
    const from = this.dateFrom();
    if (from) txns = txns.filter(t => new Date(t.createdAt) >= new Date(from));
    const to = this.dateTo();
    if (to) txns = txns.filter(t => new Date(t.createdAt) <= new Date(to + 'T23:59:59'));
    return txns;
  });

  groupedTxns = computed(() => {
    const txns = this.filteredTxns();
    const today     = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const groups: { label: string; key: string; txns: Transaction[] }[] = [];
    const map = new Map<string, Transaction[]>();

    for (const txn of txns) {
      const d = new Date(txn.createdAt); d.setHours(0,0,0,0);
      let key: string;
      if (d.getTime() === today.getTime())          key = 'Today';
      else if (d.getTime() === yesterday.getTime()) key = 'Yesterday';
      else                                          key = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(txn);
    }

    map.forEach((t, label) => groups.push({ label, key: label, txns: t }));
    return groups;
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
        this.toast.success(
          `${sender.currency} ${this.amountForm.value.amount} sent to ${recipient.fullName}.`
        );
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

  copyTxnId(id: string, ev: Event): void {
    ev.stopPropagation();
    void this.clipboard.copy(id, 'Transaction ID copied');
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
        this.toast.success('Receipt downloaded');
      },
      error: () => {
        this.downloadingPdfId.set(null);
        this.toast.warning('Receipt not available yet for this transaction.');
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
    this.toast.info(`Exported ${rows.length} transactions to CSV`);
  }
}
