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
  templateUrl: './wallet.component.html',
  styleUrls: ['./wallet.component.scss']
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
