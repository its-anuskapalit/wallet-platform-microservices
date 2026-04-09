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
  template: `
    <div class="admin-page page-enter">

      <!-- Page Header -->
      <div class="page-header">
        <div>
          <p class="label-sm text-muted">ADMINISTRATION</p>
          <h1 class="headline-lg">Admin Panel</h1>
        </div>
        <span class="admin-badge">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="8" height="6" rx="1"/><path d="M5 7V5a2 2 0 014 0v2"/></svg>
          Admin Only
        </span>
      </div>

      <!-- Tab bar -->
      <div class="tab-bar">
        <button class="tab-btn" [class.active]="activeTab() === 'dashboard'" (click)="activeTab.set('dashboard')">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
          Fraud Dashboard
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'kyc'" (click)="activeTab.set('kyc')">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="6" r="2.5"/><path d="M3 14c0-3.87 2.24-5 5-5s5 1.13 5 5"/><path d="M11 4l1.5 1.5L15 3"/></svg>
          KYC Review
          @if (pendingKycCount() > 0) {
            <span class="tab-badge">{{ pendingKycCount() }}</span>
          }
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'users'" (click)="onOpenUsersTab()">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="5" r="2.5"/><path d="M1 14c0-3.31 2.24-5 5-5s5 1.69 5 5"/><circle cx="13" cy="5" r="1.5"/><path d="M11 14c0-1.66 1-2.5 2-2.5s2 .84 2 2.5"/></svg>
          Users
        </button>
      </div>

      <!-- ══════════════ TAB: FRAUD DASHBOARD ══════════════ -->
      @if (activeTab() === 'dashboard') {
        <!-- Stats -->
        <div class="admin-stats">
          <div class="stat-card stat-card--warning">
            <div class="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
            </div>
            @if (loadingDashboard()) {
              <div class="skeleton" style="height: 40px; width: 80px; margin-top: 12px;"></div>
            } @else {
              <div class="stat-number">{{ dashboard()?.totalFraudFlags ?? 0 }}</div>
            }
            <p class="stat-label">Total Fraud Flags</p>
          </div>

          <div class="stat-card stat-card--error">
            <div class="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            </div>
            @if (loadingDashboard()) {
              <div class="skeleton" style="height: 40px; width: 80px; margin-top: 12px;"></div>
            } @else {
              <div class="stat-number">{{ dashboard()?.unresolvedFraudFlags ?? 0 }}</div>
            }
            <p class="stat-label">Unresolved Flags</p>
          </div>

          <div class="stat-card stat-card--success">
            <div class="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
            </div>
            <div class="stat-number">{{ resolvedCount() }}</div>
            <p class="stat-label">Resolved Flags</p>
          </div>
        </div>

        <!-- Fraud flags + Flag form -->
        <div class="admin-grid">
          <div class="card table-wrap">
            <div class="section-header">
              <h3 class="title-md">Fraud Flags</h3>
              <button class="btn btn-secondary btn-sm" (click)="loadFraudFlags()">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 7a6 6 0 1010.95 3.26"/><path d="M13 3.5L11 6 8.5 4"/></svg>
                Refresh
              </button>
            </div>

            @if (loadingFlags()) {
              @for (i of [1,2,3]; track i) {
                <div class="flag-row" style="padding: 16px 0; display:flex; gap:12px; align-items:center;">
                  <div class="skeleton" style="width: 36px; height: 36px; border-radius: 10px;"></div>
                  <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
                    <div class="skeleton" style="height: 13px; width: 60%;"></div>
                    <div class="skeleton" style="height: 11px; width: 40%;"></div>
                  </div>
                  <div class="skeleton" style="height: 22px; width: 70px; border-radius: 20px;"></div>
                </div>
              }
            } @else if (fraudFlags().length === 0) {
              <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="var(--outline-variant)" stroke-width="1.5"><path d="M24 8l5.66 11.46L42.5 21.2l-9.25 9.02L35.6 42.5 24 36.39 12.4 42.5l2.35-12.28L5.5 21.2l12.84-1.74z"/></svg>
                <p class="body-md text-muted">No fraud flags found</p>
              </div>
            } @else {
              <div class="list-spaced">
                @for (flag of fraudFlags(); track flag.id) {
                  <div class="flag-item" [class.resolved]="flag.isResolved">
                    <div class="flag-icon" [class.resolved]="flag.isResolved">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M10.29 2.57L1.64 13a1.33 1.33 0 001.14 2h10.44a1.33 1.33 0 001.14-2L5.71 2.57a1.33 1.33 0 00-2.28 0z"/><path d="M8 6v3M8 11h.01"/></svg>
                    </div>
                    <div class="flag-info">
                      <span class="title-sm">{{ flag.reason }}</span>
                      <span class="label-sm text-muted">Txn: {{ flag.transactionId | slice:0:8 }}… · {{ flag.createdAt | date:'MMM d, h:mm a' }}</span>
                    </div>
                    @if (flag.isResolved) {
                      <span class="badge badge-success">Resolved</span>
                    } @else {
                      <span class="badge badge-error">Open</span>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <div class="card">
            <h3 class="title-md" style="margin-bottom: 20px;">Flag Transaction</h3>
            <p class="body-sm text-muted" style="margin-bottom: 20px;">Mark a suspicious transaction for compliance investigation.</p>

            <form [formGroup]="flagForm" (ngSubmit)="onFlagTransaction()" style="display:flex;flex-direction:column;gap:18px;">
              <div class="form-group">
                <label>Transaction ID</label>
                <input type="text" class="form-control" formControlName="transactionId" placeholder="Paste transaction ID"/>
              </div>
              <div class="form-group">
                <label>Reason for flagging</label>
                <textarea class="form-control" formControlName="reason" placeholder="Describe why this transaction is suspicious..." rows="4" style="resize:vertical;"></textarea>
              </div>
              @if (flagSuccess()) {
                <div class="alert-success">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M13 4l-7 7-3-3"/></svg>
                  {{ flagSuccess() }}
                </div>
              }
              @if (flagError()) { <div class="alert-error">{{ flagError() }}</div> }
              <button type="submit" class="btn btn-primary" [disabled]="submittingFlag()">
                @if (submittingFlag()) { <span class="spinner-sm"></span> }
                Flag Transaction
              </button>
            </form>
          </div>
        </div>
      }

      <!-- ══════════════ TAB: KYC REVIEW ══════════════ -->
      @if (activeTab() === 'kyc') {
        <div class="kyc-tab">

          <!-- How it works banner -->
          <div class="kyc-info-banner">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="10" cy="10" r="8"/><path d="M10 6v4M10 13h.01"/></svg>
            <p class="body-sm">Enter a user's <strong>User ID</strong> to look up their pending KYC submission and make an approval decision. The user will be notified automatically via email.</p>
          </div>

          <div class="kyc-review-grid">
            <!-- Lookup + Review form -->
            <div class="card">
              <h3 class="title-md" style="margin-bottom:6px;">Review a KYC Submission</h3>
              <p class="label-sm text-muted" style="margin-bottom:24px;">Look up a user profile by their User ID to review their KYC document.</p>

              <!-- Step 1: Email lookup -->
              <div class="review-step">
                <div class="step-num">1</div>
                <div style="flex:1">
                  <p class="title-sm" style="margin-bottom:12px;">Enter User's Email</p>
                  <div class="lookup-row">
                    <input
                      type="email"
                      class="form-control"
                      [formControl]="lookupForm.controls.userId"
                      placeholder="e.g. user@example.com"
                    />
                    <button class="btn btn-secondary" (click)="onLookup()" [disabled]="lookingUp()">
                      @if (lookingUp()) { <span class="spinner-sm"></span> }
                      Look up
                    </button>
                  </div>
                  @if (lookupError()) {
                    <p class="field-error" style="margin-top:8px;">{{ lookupError() }}</p>
                  }
                </div>
              </div>

              <!-- Step 2: Profile card (shown after lookup) -->
              @if (lookedUpProfile()) {
                <div class="review-step">
                  <div class="step-num done">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><path d="M2 7l4 4 6-6"/></svg>
                  </div>
                  <div style="flex:1">
                    <p class="title-sm" style="margin-bottom:14px;">User Profile</p>
                    <div class="profile-lookup-card">
                      <div class="plc-avatar">{{ profileInitials() }}</div>
                      <div class="plc-info">
                        <p class="title-sm">{{ lookedUpProfile()!.fullName }}</p>
                        <p class="label-sm text-muted">{{ lookedUpProfile()!.email }}</p>
                        <p class="label-sm text-muted" style="margin-top:2px;">{{ lookedUpProfile()!.phone }}</p>
                      </div>
                      <span class="badge" [class]="kycStatusBadge(lookedUpProfile()!.kycStatus)">
                        {{ lookedUpProfile()!.kycStatus || 'Unknown' }}
                      </span>
                    </div>

                    <!-- Can only review if status is Pending -->
                    @if (lookedUpProfile()!.kycStatus !== 'Pending') {
                      <div class="no-review-notice">
                        @if (lookedUpProfile()!.kycStatus === 'Approved') {
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--success)" stroke-width="1.5" stroke-linecap="round"><path d="M15 5L7 13l-4-4"/></svg>
                          <span>This user is already <strong>approved</strong>. No action needed.</span>
                        } @else if (lookedUpProfile()!.kycStatus === 'Rejected') {
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--error)" stroke-width="1.5" stroke-linecap="round"><circle cx="9" cy="9" r="8"/><path d="M6 6l6 6M12 6l-6 6"/></svg>
                          <span>This user's KYC was already <strong>rejected</strong>.</span>
                        } @else {
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--warning)" stroke-width="1.5" stroke-linecap="round"><circle cx="9" cy="9" r="8"/><path d="M9 5v4M9 12h.01"/></svg>
                          <span>This user has <strong>not submitted</strong> KYC yet. Nothing to review.</span>
                        }
                      </div>
                    }
                  </div>
                </div>

                <!-- Step 3: Approve / Reject decision (only for Pending) -->
                @if (lookedUpProfile()!.kycStatus === 'Pending') {
                  <div class="review-step">
                    <div class="step-num" [class.active]="true">3</div>
                    <div style="flex:1">
                      <p class="title-sm" style="margin-bottom:16px;">Make a Decision</p>

                      <form [formGroup]="reviewForm" (ngSubmit)="onSubmitReview()">
                        <!-- Decision toggle -->
                        <div class="decision-toggle">
                          <label class="decision-option approve" [class.selected]="reviewForm.get('decision')?.value === 'approve'">
                            <input type="radio" formControlName="decision" value="approve" style="display:none"/>
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 5L7 13l-4-4"/></svg>
                            <span>Approve</span>
                          </label>
                          <label class="decision-option reject" [class.selected]="reviewForm.get('decision')?.value === 'reject'">
                            <input type="radio" formControlName="decision" value="reject" style="display:none"/>
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M13 5L5 13M5 5l8 8"/></svg>
                            <span>Reject</span>
                          </label>
                        </div>

                        <!-- Rejection reason (shown only when reject is selected) -->
                        @if (reviewForm.get('decision')?.value === 'reject') {
                          <div class="form-group" style="margin-top:16px;">
                            <label>Rejection Reason <span style="color:var(--error)">*</span></label>
                            <textarea
                              class="form-control"
                              formControlName="rejectionReason"
                              placeholder="e.g. Document image is unclear, please resubmit a higher quality scan."
                              rows="3"
                              style="resize:vertical;"
                            ></textarea>
                            @if (reviewForm.get('rejectionReason')?.invalid && reviewForm.get('rejectionReason')?.touched) {
                              <span class="field-error">Please provide a rejection reason</span>
                            }
                          </div>
                        }

                        <!-- Notes (optional) -->
                        <div class="form-group" style="margin-top:14px;">
                          <label>Internal Notes <span class="label-sm text-muted">(optional)</span></label>
                          <input type="text" class="form-control" formControlName="notes" placeholder="For internal reference only"/>
                        </div>

                        @if (reviewSuccess()) {
                          <div class="alert-success" style="margin-top:16px;">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M13 4l-7 7-3-3"/></svg>
                            {{ reviewSuccess() }}
                          </div>
                        }
                        @if (reviewError()) {
                          <div class="alert-error" style="margin-top:16px;">{{ reviewError() }}</div>
                        }

                        <div style="display:flex;gap:12px;margin-top:20px;">
                          <button type="button" class="btn btn-secondary" (click)="clearLookup()">
                            Cancel
                          </button>
                          <button
                            type="submit"
                            class="btn"
                            [class]="reviewForm.get('decision')?.value === 'approve' ? 'btn-primary' : 'btn-reject'"
                            [disabled]="submittingReview() || !reviewForm.get('decision')?.value"
                          >
                            @if (submittingReview()) { <span class="spinner-sm"></span> }
                            @if (reviewForm.get('decision')?.value === 'approve') {
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M13 4l-7 7-3-3"/></svg>
                              Approve KYC
                            } @else if (reviewForm.get('decision')?.value === 'reject') {
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 4L4 12M4 4l8 8"/></svg>
                              Reject KYC
                            } @else {
                              Select a decision above
                            }
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                }
              }
            </div>

            <!-- Right: Info panel -->
            <div style="display:flex;flex-direction:column;gap:16px;">

              <!-- Quick stats -->
              <div class="card kyc-stat-card">
                <p class="label-sm text-muted" style="margin-bottom:16px;">KYC OVERVIEW</p>
                <div class="kyc-stat-row">
                  <span class="badge badge-warning">Pending</span>
                  <span class="title-sm">{{ pendingKycCount() }} awaiting review</span>
                </div>
              </div>

              <!-- Guidelines card -->
              <div class="card guidelines-card">
                <h4 class="title-sm" style="margin-bottom:14px;">Review Guidelines</h4>
                <div class="guideline-list">
                  <div class="guideline-item">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--success)" stroke-width="1.5" stroke-linecap="round"><path d="M13 4l-7 7-3-3"/></svg>
                    <span class="label-md">Verify the document number matches the user's profile details</span>
                  </div>
                  <div class="guideline-item">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--success)" stroke-width="1.5" stroke-linecap="round"><path d="M13 4l-7 7-3-3"/></svg>
                    <span class="label-md">Ensure the document type is valid and government-issued</span>
                  </div>
                  <div class="guideline-item">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--success)" stroke-width="1.5" stroke-linecap="round"><path d="M13 4l-7 7-3-3"/></svg>
                    <span class="label-md">Reject if document appears expired or tampered with</span>
                  </div>
                  <div class="guideline-item">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--success)" stroke-width="1.5" stroke-linecap="round"><path d="M13 4l-7 7-3-3"/></svg>
                    <span class="label-md">Always provide a clear reason when rejecting</span>
                  </div>
                  <div class="guideline-item">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--success)" stroke-width="1.5" stroke-linecap="round"><path d="M13 4l-7 7-3-3"/></svg>
                    <span class="label-md">Approved users receive an email notification automatically</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ══════════════ TAB: USERS ══════════════ -->
      @if (activeTab() === 'users') {
        <div class="card">
          <div class="section-head" style="margin-bottom:20px;">
            <div>
              <h3 class="title-md">All Users</h3>
              <p class="label-sm text-muted">{{ usersPage().totalCount }} total users</p>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-secondary btn-sm" (click)="loadUsers(currentPage() - 1)" [disabled]="currentPage() <= 1">← Prev</button>
              <span class="label-sm" style="padding:6px 10px;background:var(--surface-container-low);border-radius:8px;">
                {{ currentPage() }} / {{ usersPage().totalPages || 1 }}
              </span>
              <button class="btn btn-secondary btn-sm" (click)="loadUsers(currentPage() + 1)" [disabled]="currentPage() >= usersPage().totalPages">Next →</button>
            </div>
          </div>

          @if (loadingUsers()) {
            @for (i of [1,2,3,4,5]; track i) {
              <div class="user-row-skeleton">
                <div class="skeleton" style="width:40px;height:40px;border-radius:50%;flex-shrink:0;"></div>
                <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
                  <div class="skeleton" style="height:13px;width:40%;"></div>
                  <div class="skeleton" style="height:11px;width:30%;"></div>
                </div>
                <div class="skeleton" style="height:28px;width:80px;border-radius:8px;"></div>
              </div>
            }
          } @else if (usersPage().items.length === 0) {
            <div class="empty-state" style="padding:40px;">
              <p class="body-md text-muted">No users found.</p>
            </div>
          } @else {
            <div class="users-table">
              @for (user of usersPage().items; track user.userId) {
                <div class="user-row">
                  <div class="user-avatar">{{ userInitials(user) }}</div>
                  <div class="user-info">
                    <span class="title-sm">{{ user.fullName || 'Unnamed' }}</span>
                    <span class="label-sm text-muted">{{ user.email }}</span>
                  </div>
                  <div class="user-meta">
                    <span class="badge" [class]="kycStatusBadge(user.kycStatus)">{{ user.kycStatus || 'Not Submitted' }}</span>
                  </div>
                  <div class="user-actions">
                    @if (freezeTargetId() === user.userId) {
                      <!-- Inline freeze reason input -->
                      <input type="text" class="form-control form-control-sm" placeholder="Reason for freeze…"
                             [(ngModel)]="freezeReason" style="min-width:160px;font-size:12px;"/>
                      <button class="btn btn-sm" style="background:var(--error);color:white;"
                              (click)="confirmFreeze(user)" [disabled]="!freezeReason.trim() || freezingUserId() === user.userId">
                        @if (freezingUserId() === user.userId) { <span class="spinner-sm"></span> }
                        @else { Confirm }
                      </button>
                      <button class="btn btn-secondary btn-sm" (click)="cancelFreeze()">Cancel</button>
                    } @else {
                      <button class="btn btn-secondary btn-sm" style="color:var(--error);"
                              (click)="startFreeze(user.userId)" [disabled]="freezingUserId() === user.userId">
                        Freeze
                      </button>
                      <button class="btn btn-secondary btn-sm" style="color:var(--success);"
                              (click)="onUnfreezeUser(user)" [disabled]="freezingUserId() === user.userId">
                        @if (freezingUserId() === user.userId) { <span class="spinner-sm spinner-dark"></span> }
                        @else { Unfreeze }
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }

          @if (userActionSuccess()) {
            <div class="alert-success" style="margin-top:14px;">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M13 4l-7 7-3-3"/></svg>
              {{ userActionSuccess() }}
            </div>
          }
          @if (userActionError()) {
            <div class="alert-error" style="margin-top:14px;">{{ userActionError() }}</div>
          }
        </div>
      }

    </div>
  `,
  styles: [`
    .admin-page { max-width: 1100px; }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      h1 { margin-top: 4px; }
    }

    .admin-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--error-container);
      color: var(--error);
      padding: 8px 16px;
      border-radius: var(--radius-full);
      font-size: 13px;
      font-weight: 600;
    }

    // ── Tabs ───────────────────────────────────────────────────────────────
    .tab-bar {
      display: flex;
      gap: 4px;
      margin-bottom: 24px;
      background: var(--surface-container-low);
      padding: 4px;
      border-radius: var(--radius-md);
      width: fit-content;
    }

    .tab-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 18px;
      border: none;
      border-radius: 10px;
      background: transparent;
      font-size: 14px;
      font-weight: 500;
      color: var(--on-surface-variant);
      cursor: pointer;
      transition: all 0.15s;
      position: relative;

      &.active {
        background: var(--surface-container-lowest);
        color: var(--on-surface);
        font-weight: 600;
        box-shadow: var(--shadow-ambient);
      }

      &:hover:not(.active) { background: var(--surface-container); }
    }

    .tab-badge {
      background: var(--warning-container);
      color: var(--warning);
      font-size: 11px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: var(--radius-full);
    }

    // ── Fraud stats ────────────────────────────────────────────────────────
    .admin-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;

      @media (max-width: 700px) { grid-template-columns: 1fr; }
    }

    .stat-card {
      border-radius: var(--radius-lg);
      padding: 28px 24px;
      box-shadow: var(--shadow-ambient);

      &--warning { background: var(--warning-container); }
      &--error   { background: var(--error-container); }
      &--success { background: var(--success-container); }
    }

    .stat-icon {
      margin-bottom: 12px;

      .stat-card--warning & { color: var(--warning); }
      .stat-card--error &   { color: var(--error); }
      .stat-card--success & { color: var(--success); }
    }

    .stat-number {
      font-family: var(--font-display);
      font-size: 2.5rem;
      font-weight: 800;
      line-height: 1;
      margin-bottom: 6px;
    }

    .stat-label { font-size: 13px; font-weight: 500; opacity: 0.7; }

    // ── Fraud grid ─────────────────────────────────────────────────────────
    .admin-grid {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 20px;
      align-items: start;

      @media (max-width: 1000px) { grid-template-columns: 1fr; }
    }

    .table-wrap { padding: 24px; }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .flag-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;

      &.resolved { opacity: 0.6; }
    }

    .flag-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: var(--error-container);
      color: var(--error);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      &.resolved { background: var(--success-container); color: var(--success); }
    }

    .flag-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 48px 20px;
    }

    // ── KYC tab ────────────────────────────────────────────────────────────
    .kyc-tab { display: flex; flex-direction: column; gap: 16px; }

    .kyc-info-banner {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 18px;
      background: var(--primary-fixed);
      color: var(--primary);
      border-radius: var(--radius-md);
    }

    .kyc-review-grid {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 20px;
      align-items: start;

      @media (max-width: 960px) { grid-template-columns: 1fr; }
    }

    // ── Review steps ───────────────────────────────────────────────────────
    .review-step {
      display: flex;
      gap: 16px;
      padding: 20px 0;

      & + & { border-top: 1px solid rgba(200,197,192,0.25); }
    }

    .step-num {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--surface-container);
      border: 2px solid var(--outline-variant);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      color: var(--on-surface-variant);
      flex-shrink: 0;
      margin-top: 2px;

      &.done {
        background: var(--success);
        border-color: var(--success);
      }

      &.active {
        border-color: var(--primary);
        color: var(--primary);
        background: var(--primary-fixed);
      }
    }

    .lookup-row {
      display: flex;
      gap: 10px;

      .form-control { flex: 1; }
    }

    // ── Profile lookup card ────────────────────────────────────────────────
    .profile-lookup-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px;
      background: var(--surface-container-low);
      border-radius: var(--radius-md);
    }

    .plc-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--primary-container));
      color: white;
      font-family: var(--font-display);
      font-size: 16px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .plc-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }

    .no-review-notice {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-top: 14px;
      padding: 12px 14px;
      background: var(--surface-container-low);
      border-radius: var(--radius-md);
      font-size: 13px;
      color: var(--on-surface-variant);
    }

    // ── Decision toggle ────────────────────────────────────────────────────
    .decision-toggle {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .decision-option {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 16px;
      border-radius: var(--radius-md);
      background: var(--surface-container-low);
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.15s;
      border: 2px solid transparent;

      &:hover { background: var(--surface-container); }

      &.approve.selected {
        background: var(--success-container);
        color: var(--success);
        border-color: var(--success);
      }

      &.reject.selected {
        background: var(--error-container);
        color: var(--error);
        border-color: var(--error);
      }
    }

    .btn-reject {
      background: var(--error);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      padding: 14px 24px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;

      &:hover { opacity: 0.9; }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    // ── KYC sidebar cards ──────────────────────────────────────────────────
    .kyc-stat-card { padding: 20px 24px; }

    .kyc-stat-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .guidelines-card { padding: 20px 24px; }

    .guideline-list { display: flex; flex-direction: column; gap: 10px; }

    .guideline-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 13px;
      color: var(--on-surface-variant);
      line-height: 1.4;
    }

    // ── Alerts ─────────────────────────────────────────────────────────────
    .alert-success, .alert-error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border-radius: var(--radius-md);
      font-size: 14px;
    }
    .alert-success { background: var(--success-container); color: var(--success); }
    .alert-error   { background: var(--error-container);   color: var(--error); }

    // ── Users table ────────────────────────────────────────────────────────
    .users-table { display: flex; flex-direction: column; gap: 2px; }

    .user-row, .user-row-skeleton {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 8px;
      border-radius: var(--radius-md);
      transition: background 0.12s;

      &:hover { background: var(--surface-container-low); }
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--primary-container));
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      flex-shrink: 0;
    }

    .user-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .user-meta { flex-shrink: 0; }
    .user-actions { display: flex; gap: 6px; flex-shrink: 0; }

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
