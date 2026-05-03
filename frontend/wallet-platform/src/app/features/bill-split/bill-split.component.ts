import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { BillSplitService } from '../../core/services/bill-split.service';
import { AuthService } from '../../core/services/auth.service';
import { BillSplit } from '../../core/models/bill-split.models';

@Component({
  selector: 'app-bill-split',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, ReactiveFormsModule],
  templateUrl: './bill-split.component.html',
  styleUrls: ['./bill-split.component.scss']
})
export class BillSplitComponent implements OnInit {
  private svc  = inject(BillSplitService);
  private auth = inject(AuthService);
  private fb   = inject(FormBuilder);

  loading    = signal(true);
  activeTab  = signal<'owed' | 'created'>('owed');
  showCreate = signal(false);
  creating   = signal(false);
  payingId   = signal<string | null>(null);
  errorMsg   = signal<string | null>(null);
  createError = signal<string | null>(null);

  createdSplits = signal<BillSplit[]>([]);
  owedSplits    = signal<BillSplit[]>([]);

  currentEmail = computed(() => this.auth.currentUser()?.email ?? '');

  pendingOwed = computed(() =>
    this.owedSplits().filter(s =>
      s.participants.some(p => p.email === this.currentEmail() && p.status === 'Pending')
    ).length
  );

  createForm = this.fb.group({
    title: ['', Validators.required],
    totalAmount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    participants: this.fb.array([this.newParticipantGroup()])
  });

  get participantsArray() {
    return this.createForm.get('participants') as FormArray;
  }

  sharesTotal = computed(() => {
    const ctrls = this.participantsArray.controls;
    return ctrls.reduce((sum, c) => sum + (Number(c.get('shareAmount')?.value) || 0), 0);
  });

  sharesMismatch = computed(() => {
    const total = Number(this.createForm.get('totalAmount')?.value) || 0;
    if (!total) return false;
    return Math.abs(this.sharesTotal() - total) > 0.01;
  });

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true);
    this.svc.getOwed().subscribe({
      next: data => this.owedSplits.set(data),
      error: () => {}
    });
    this.svc.getCreated().subscribe({
      next: data => { this.createdSplits.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  private newParticipantGroup() {
    return this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      shareAmount: [null as number | null, [Validators.required, Validators.min(0.01)]]
    });
  }

  addParticipant(): void {
    this.participantsArray.push(this.newParticipantGroup());
  }

  removeParticipant(i: number): void {
    this.participantsArray.removeAt(i);
  }

  submitCreate(): void {
    if (this.createForm.invalid || this.sharesMismatch()) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.creating.set(true);
    this.createError.set(null);
    const { title, totalAmount, participants } = this.createForm.value;
    this.svc.create({
      title: title!,
      totalAmount: totalAmount!,
      participants: (participants as any[]).map(p => ({ email: p.email, shareAmount: p.shareAmount }))
    }).subscribe({
      next: split => {
        this.createdSplits.update(list => [split, ...list]);
        this.creating.set(false);
        this.showCreate.set(false);
        this.createForm.reset();
        this.participantsArray.clear();
        this.participantsArray.push(this.newParticipantGroup());
        this.activeTab.set('created');
      },
      error: err => {
        const body = err?.error;
        const msg =
          (typeof body === 'string' ? body : null) ??
          body?.error ??
          body?.title ??
          err?.message ??
          'Failed to create split.';
        this.createError.set(msg);
        this.creating.set(false);
      }
    });
  }

  payShare(split: BillSplit): void {
    this.payingId.set(split.id);
    this.errorMsg.set(null);
    this.svc.payShare(split.id).subscribe({
      next: updated => {
        this.owedSplits.update(list => list.map(s => s.id === updated.id ? updated : s));
        this.payingId.set(null);
      },
      error: err => {
        this.errorMsg.set(err?.error?.error ?? 'Payment failed.');
        this.payingId.set(null);
      }
    });
  }

  closeCreate(): void {
    this.showCreate.set(false);
    this.createError.set(null);
  }

  getMyShare(split: BillSplit) {
    return split.participants.find(p => p.email === this.currentEmail()) ?? null;
  }

  paidCount(split: BillSplit)     { return split.participants.filter(p => p.status === 'Paid').length; }
  collectedAmount(split: BillSplit) { return split.participants.filter(p => p.status === 'Paid').reduce((s, p) => s + p.shareAmount, 0); }
  paidPercent(split: BillSplit)   { return split.participants.length ? (this.paidCount(split) / split.participants.length) * 100 : 0; }

  initials(email: string): string {
    return email.slice(0, 2).toUpperCase();
  }

  statusLabel(s: string) {
    return { Open: 'Open', PartiallyPaid: 'Partial', Completed: 'Done', Cancelled: 'Cancelled' }[s] ?? s;
  }

  statusClass(s: string) {
    return { Open: 'badge-neutral', PartiallyPaid: 'badge-warning', Completed: 'badge-success', Cancelled: 'badge-error' }[s] ?? 'badge-neutral';
  }
}
