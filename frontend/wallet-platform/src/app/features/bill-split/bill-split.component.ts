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
  template: `
    <div class="bs-page page-enter">

      <!-- Header -->
      <div class="page-header bs-page-header">
        <div>
          <p class="label-sm text-muted">FINANCE</p>
          <h1 class="headline-lg">Bill Split</h1>
        </div>
        <button type="button" class="btn btn-primary bs-btn-new-split" (click)="showCreate.set(true)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>
          New Split
        </button>
      </div>

      <!-- Tabs -->
      <div class="tab-bar">
        <button class="tab-btn" [class.active]="activeTab() === 'owed'" (click)="activeTab.set('owed')">
          Requests for Me
          @if (pendingOwed() > 0) { <span class="tab-badge">{{ pendingOwed() }}</span> }
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'created'" (click)="activeTab.set('created')">
          My Splits
        </button>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="card" style="padding: 32px;">
          @for (i of [1,2,3]; track i) {
            <div style="margin-bottom:16px;">
              <div class="skeleton" style="height:18px;width:40%;margin-bottom:8px;"></div>
              <div class="skeleton" style="height:13px;width:70%;"></div>
            </div>
          }
        </div>
      }

      <!-- Owed Tab -->
      @if (!loading() && activeTab() === 'owed') {
        @if (owedSplits().length === 0) {
          <div class="empty-state card">
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="var(--outline-variant)" stroke-width="1.5"><circle cx="26" cy="26" r="22"/><path d="M17 26h18M26 17l9 9-9 9"/></svg>
            <p class="title-sm">No pending requests</p>
            <p class="body-sm text-muted">You have no outstanding bill shares to pay.</p>
          </div>
        } @else {
          <div class="splits-list">
            @for (split of owedSplits(); track split.id) {
              <div class="split-card card">
                <div class="split-header">
                  <div>
                    <h3 class="title-md">{{ split.title }}</h3>
                    <p class="body-sm text-muted">From {{ split.creatorEmail }} · {{ split.createdAt | date:'MMM d, yyyy' }}</p>
                  </div>
                  <span class="badge" [class]="statusClass(split.status)">{{ statusLabel(split.status) }}</span>
                </div>

                <div class="split-participants">
                  @for (p of split.participants; track p.id) {
                    <div class="participant-row" [class.mine]="p.email === currentEmail()">
                      <div class="p-avatar">{{ initials(p.email) }}</div>
                      <div class="p-info">
                        <span class="p-email">{{ p.email }}</span>
                        @if (p.email === currentEmail()) { <span class="p-you">You</span> }
                      </div>
                      <span class="p-amount">{{ p.shareAmount | currency:'INR' }}</span>
                      <span class="p-status" [class.paid]="p.status === 'Paid'">
                        @if (p.status === 'Paid') {
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 7l4 4 6-6"/></svg>
                          Paid
                        } @else { Pending }
                      </span>
                    </div>
                  }
                </div>

                @if (getMyShare(split)?.status === 'Pending') {
                  <div class="split-footer">
                    <span class="body-sm text-muted">Your share: <strong>{{ getMyShare(split)!.shareAmount | currency:'INR' }}</strong></span>
                    <button class="btn btn-primary btn-sm" [disabled]="payingId() === split.id" (click)="payShare(split)">
                      @if (payingId() === split.id) { <span class="spinner-sm"></span> Paying… }
                      @else { Pay ₹{{ getMyShare(split)!.shareAmount }} }
                    </button>
                  </div>
                } @else if (getMyShare(split)?.status === 'Paid') {
                  <div class="split-footer paid-footer">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 8l5 5 7-7"/></svg>
                    You paid on {{ getMyShare(split)!.paidAt | date:'MMM d, h:mm a' }}
                  </div>
                }
              </div>
            }
          </div>
        }
      }

      <!-- Created Tab -->
      @if (!loading() && activeTab() === 'created') {
        @if (createdSplits().length === 0) {
          <div class="empty-state card">
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="var(--outline-variant)" stroke-width="1.5"><rect x="10" y="14" width="32" height="24" rx="4"/><path d="M10 22h32M20 22v16"/></svg>
            <p class="title-sm">No splits yet</p>
            <p class="body-sm text-muted">Create a new bill split to share expenses with others.</p>
          </div>
        } @else {
          <div class="splits-list">
            @for (split of createdSplits(); track split.id) {
              <div class="split-card card">
                <div class="split-header">
                  <div>
                    <h3 class="title-md">{{ split.title }}</h3>
                    <p class="body-sm text-muted">{{ split.createdAt | date:'MMM d, yyyy' }} · Total: {{ split.totalAmount | currency:'INR' }}</p>
                  </div>
                  <span class="badge" [class]="statusClass(split.status)">{{ statusLabel(split.status) }}</span>
                </div>

                <div class="split-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" [style.width.%]="paidPercent(split)"></div>
                  </div>
                  <span class="progress-label">{{ paidCount(split) }}/{{ split.participants.length }} paid · {{ collectedAmount(split) | currency:'INR' }} collected</span>
                </div>

                <div class="split-participants">
                  @for (p of split.participants; track p.id) {
                    <div class="participant-row">
                      <div class="p-avatar">{{ initials(p.email) }}</div>
                      <div class="p-info"><span class="p-email">{{ p.email }}</span></div>
                      <span class="p-amount">{{ p.shareAmount | currency:'INR' }}</span>
                      <span class="p-status" [class.paid]="p.status === 'Paid'">
                        @if (p.status === 'Paid') {
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 7l4 4 6-6"/></svg>
                          Paid
                        } @else { Pending }
                      </span>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
      }

      @if (errorMsg()) {
        <div class="alert-error" style="margin-top:16px;">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8" r="7"/><path d="M8 5v3M8 11h.01"/></svg>
          {{ errorMsg() }}
        </div>
      }
    </div>

    <!-- ── Create Split Modal ── -->
    @if (showCreate()) {
      <div class="modal-overlay" (click)="closeCreate()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="title-lg">New Bill Split</h3>
            <button class="modal-close" (click)="closeCreate()">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 4l10 10M14 4L4 14"/></svg>
            </button>
          </div>

          <form id="create-split-form" [formGroup]="createForm" (ngSubmit)="submitCreate()" class="modal-body">
            <!-- Title -->
            <div class="form-group">
              <label>Bill Title</label>
              <input type="text" class="form-control" formControlName="title" placeholder="e.g. Dinner at Taj, Trip expenses"/>
              @if (createForm.get('title')?.invalid && createForm.get('title')?.touched) {
                <span class="field-error">Title is required</span>
              }
            </div>

            <!-- Total Amount -->
            <div class="form-group">
              <label>Total Amount (₹)</label>
              <input type="number" class="form-control" formControlName="totalAmount" placeholder="0.00" min="1"/>
            </div>

            <!-- Participants -->
            <div class="form-group">
              <div class="participants-header">
                <label>Participants</label>
                <button type="button" class="btn-add-participant" (click)="addParticipant()">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 2v10M2 7h10"/></svg>
                  Add Person
                </button>
              </div>

              <div formArrayName="participants" class="participants-list">
                @for (ctrl of participantsArray.controls; track ctrl; let i = $index) {
                  <div [formGroupName]="i" class="participant-input-row">
                    <input type="email" class="form-control" formControlName="email" placeholder="email@example.com"/>
                    <input type="number" class="form-control share-input" formControlName="shareAmount" placeholder="₹ share" min="0.01"/>
                    @if (participantsArray.length > 1) {
                      <button type="button" class="btn-remove" (click)="removeParticipant(i)">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>
                      </button>
                    }
                  </div>
                }
              </div>

              <!-- Running total indicator -->
              <div class="total-check" [class.mismatch]="sharesMismatch()">
                <span>Shares total: <strong>{{ sharesTotal() | currency:'INR' }}</strong></span>
                @if (createForm.get('totalAmount')?.value) {
                  <span [class.ok]="!sharesMismatch()" [class.err]="sharesMismatch()">
                    {{ sharesMismatch() ? '✗ Must equal total' : '✓ Matches' }}
                  </span>
                }
              </div>
            </div>

            @if (createError()) {
              <div class="alert-error">{{ createError() }}</div>
            }
          </form>

          <div class="modal-footer-actions">
            <button type="button" class="btn btn-secondary" (click)="closeCreate()">Cancel</button>
            <button type="submit" form="create-split-form" class="btn btn-primary" [disabled]="creating() || sharesMismatch()">
              @if (creating()) { <span class="spinner-sm spinner-dark"></span> Creating… }
              @else { Create Split }
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .bs-page { max-width: 860px; }

    .tab-bar {
      display: flex;
      gap: 4px;
      background: var(--surface-container-low);
      border-radius: var(--radius-md);
      padding: 4px;
      margin-bottom: 24px;
    }

    .tab-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 16px;
      border: none;
      border-radius: 10px;
      background: transparent;
      color: var(--on-surface-variant);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;

      &.active {
        background: var(--surface-container-lowest);
        color: var(--on-surface);
        box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      }
    }

    .tab-badge {
      background: var(--primary);
      color: white;
      font-size: 11px;
      font-weight: 700;
      border-radius: 99px;
      padding: 1px 7px;
      min-width: 20px;
      text-align: center;
    }

    .splits-list { display: flex; flex-direction: column; gap: 16px; }

    .split-card {
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .split-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;

      h3 { margin-bottom: 4px; }
    }

    .split-progress {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .progress-bar {
      height: 6px;
      background: var(--surface-container);
      border-radius: 99px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--primary), var(--primary-container));
      border-radius: 99px;
      transition: width 0.5s ease;
    }

    .progress-label {
      font-size: 12px;
      color: var(--on-surface-variant);
    }

    .split-participants {
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: var(--surface-container-low);
      border-radius: var(--radius-md);
      padding: 12px;
    }

    .participant-row {
      display: grid;
      grid-template-columns: 32px 1fr auto auto;
      align-items: center;
      gap: 10px;
      padding: 6px 8px;
      border-radius: 8px;

      &.mine {
        background: var(--primary-fixed);
      }
    }

    .p-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--surface-container-highest);
      color: var(--on-surface-variant);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .p-info {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow: hidden;
    }

    .p-email {
      font-size: 13px;
      color: var(--on-surface);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .p-you {
      font-size: 10px;
      font-weight: 700;
      background: var(--primary);
      color: white;
      border-radius: 99px;
      padding: 1px 6px;
      flex-shrink: 0;
    }

    .p-amount {
      font-size: 13px;
      font-weight: 600;
      color: var(--on-surface);
      white-space: nowrap;
    }

    .p-status {
      font-size: 12px;
      font-weight: 500;
      color: var(--on-surface-variant);
      display: flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;

      &.paid { color: var(--success); }
    }

    .split-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 12px;
      border-top: 1px solid var(--outline-variant);
    }

    .paid-footer {
      color: var(--success);
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
      justify-content: flex-start;
    }

    .btn-sm {
      padding: 8px 16px;
      font-size: 13px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 56px 24px;
      text-align: center;
    }

    /* ── Modal ── */
    .modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 500;
      animation: overlayFadeIn 0.2s ease;
    }

    .modal {
      background: var(--surface-container-lowest);
      border-radius: var(--radius-xl);
      width: 100%;
      max-width: 520px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: var(--shadow-float);
      animation: modalScaleIn 0.2s ease;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px 0;
    }

    .modal-close {
      width: 32px; height: 32px;
      border: none; background: var(--surface-container-low);
      border-radius: 8px; cursor: pointer; display: flex;
      align-items: center; justify-content: center;
      color: var(--on-surface-variant);
      &:hover { background: var(--surface-container); color: var(--on-surface); }
    }

    .modal-body {
      padding: 20px 24px 16px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .modal-footer-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 16px 24px 20px;
      border-top: 1px solid var(--outline-variant);
      background: var(--surface-container-low);
      border-radius: 0 0 var(--radius-xl) var(--radius-xl);
    }

    .modal-footer-actions .btn {
      min-width: 108px;
    }

    .modal-footer-actions .btn-primary {
      order: 2;
    }

    .modal-footer-actions .btn-secondary {
      order: 1;
    }

    .bs-page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .bs-btn-new-split {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    /* Participants form */
    .participants-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .btn-add-participant {
      display: flex;
      align-items: center;
      gap: 6px;
      border: none;
      background: var(--primary-fixed);
      color: var(--primary);
      font-size: 13px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 8px;
      cursor: pointer;
      &:hover { background: var(--surface-container); }
    }

    .participants-list { display: flex; flex-direction: column; gap: 8px; }

    .participant-input-row {
      display: grid;
      grid-template-columns: 1fr 110px 28px;
      gap: 8px;
      align-items: center;
    }

    .share-input { text-align: right; }

    .btn-remove {
      width: 28px; height: 28px;
      border: none; background: var(--error-container);
      color: var(--error); border-radius: 8px;
      cursor: pointer; display: flex;
      align-items: center; justify-content: center;
      &:hover { opacity: 0.8; }
    }

    .total-check {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: var(--on-surface-variant);
      padding: 8px 12px;
      border-radius: 8px;
      background: var(--surface-container-low);
      margin-top: 8px;

      .ok { color: var(--success); font-weight: 600; }
      .err { color: var(--error); font-weight: 600; }

      &.mismatch { background: var(--error-container); }
    }

    .alert-error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: var(--error-container);
      color: var(--error);
      border-radius: var(--radius-md);
      font-size: 14px;
    }

    .spinner-sm {
      width: 14px; height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      &.spinner-dark { border-color: rgba(0,0,0,0.12); border-top-color: var(--on-surface); }
    }

    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes overlayFadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes modalScaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  `]
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
