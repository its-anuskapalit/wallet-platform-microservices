import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { UserProfile, KycStatus } from '../../core/models/profile.models';

type KycStep = 'personal' | 'document' | 'status';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, DatePipe, ReactiveFormsModule],
  template: `
    <div class="profile-page page-enter">

      <div class="page-header">
        <div>
          <p class="label-sm text-muted">ACCOUNT</p>
          <h1 class="headline-lg">Profile & KYC</h1>
        </div>
      </div>

      <!-- ── Top: Avatar card ─────────────────────────────────────────── -->
      <div class="card avatar-card">
        <div class="avatar-wrap">
          <div class="avatar">{{ initials() }}</div>
          <div class="avatar-info">
            <h2 class="title-lg">{{ profile()?.fullName || '—' }}</h2>
            <p class="body-sm text-muted">{{ profile()?.email }}</p>
            <div class="badge-row">
              <span class="badge" [class]="kycBadgeClass()">
                <span class="badge-dot"></span>
                KYC {{ kycStatusLabel() }}
              </span>
              @if (profile()?.phone) {
                <span class="badge badge-neutral">{{ profile()?.phone }}</span>
              }
            </div>
          </div>
        </div>

        <!-- KYC progress strip -->
        <div class="kyc-progress-strip">
          <div class="progress-step" [class.done]="true" [class.active]="activeKycStep() === 'personal'">
            <div class="ps-circle done">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><path d="M2 7l4 4 6-6"/></svg>
            </div>
            <span class="ps-label">Personal Details</span>
          </div>
          <div class="ps-line" [class.done]="personalDetailsDone()"></div>

          <div class="progress-step"
               [class.done]="kycDocSubmitted()"
               [class.active]="activeKycStep() === 'document'">
            <div class="ps-circle" [class.done]="kycDocSubmitted()" [class.active]="activeKycStep() === 'document'">
              @if (kycDocSubmitted()) {
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><path d="M2 7l4 4 6-6"/></svg>
              } @else {
                <span>2</span>
              }
            </div>
            <span class="ps-label">KYC Document</span>
          </div>
          <div class="ps-line" [class.done]="kycApproved()"></div>

          <div class="progress-step" [class.done]="kycApproved()" [class.active]="activeKycStep() === 'status'">
            <div class="ps-circle" [class.done]="kycApproved()">
              @if (kycApproved()) {
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><path d="M2 7l4 4 6-6"/></svg>
              } @else {
                <span>3</span>
              }
            </div>
            <span class="ps-label">Approved</span>
          </div>
        </div>
      </div>

      <!-- ── Two-column layout ─────────────────────────────────────────── -->
      <div class="main-grid">

        <!-- LEFT: Personal Details ──────────────────────────────────────── -->
        <div class="card">
          <div class="section-head">
            <div>
              <h3 class="title-md">Personal Details</h3>
              <p class="label-sm text-muted" style="margin-top:4px;">Required before submitting KYC documents</p>
            </div>
            @if (!editMode() && personalDetailsDone()) {
              <button class="btn btn-secondary btn-sm" (click)="startEdit()">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2a1.5 1.5 0 012.12 2.12L4.5 11.75H2v-2.5L10 2z"/></svg>
                Edit
              </button>
            }
          </div>

          @if (!editMode()) {
            <!-- View mode -->
            @if (!personalDetailsDone()) {
              <div class="incomplete-notice">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="10" cy="10" r="8"/><path d="M10 6v4M10 13h.01"/></svg>
                <div>
                  <p class="title-sm">Complete your profile first</p>
                  <p class="label-sm">Fill in your personal details to proceed with KYC verification.</p>
                </div>
              </div>
            }
            <div class="info-table">
              <div class="info-row">
                <span class="label-md text-muted">Full Name</span>
                <span class="title-sm" [class.empty]="!profile()?.fullName">{{ profile()?.fullName || 'Not set' }}</span>
              </div>
              <div class="info-row">
                <span class="label-md text-muted">Email</span>
                <span class="title-sm">{{ profile()?.email || '—' }}</span>
              </div>
              <div class="info-row">
                <span class="label-md text-muted">Phone</span>
                <span class="title-sm" [class.empty]="!profile()?.phone">{{ profile()?.phone || 'Not set' }}</span>
              </div>
              <div class="info-row">
                <span class="label-md text-muted">Address</span>
                <span class="title-sm" [class.empty]="!profile()?.address">{{ profile()?.address || 'Not set' }}</span>
              </div>
              <div class="info-row">
                <span class="label-md text-muted">Date of Birth</span>
                <span class="title-sm" [class.empty]="!profile()?.dateOfBirth">
                  {{ profile()?.dateOfBirth ? (profile()!.dateOfBirth! | date:'MMMM d, yyyy') : 'Not set' }}
                </span>
              </div>
            </div>
            @if (!personalDetailsDone()) {
              <button class="btn btn-primary" style="margin-top:20px;" (click)="startEdit()">
                Complete Profile
              </button>
            }
          } @else {
            <!-- Edit mode -->
            <form [formGroup]="profileForm" (ngSubmit)="onSaveProfile()">
              <div class="form-fields">
                <div class="form-group">
                  <label>Full Name <span class="required">*</span></label>
                  <input type="text" class="form-control" formControlName="fullName"
                         placeholder="Your full legal name"
                         [class.error]="isInvalid('fullName')"/>
                  @if (isInvalid('fullName')) {
                    <span class="field-error">Full name is required</span>
                  }
                </div>

                <div class="form-group">
                  <label>Phone Number <span class="required">*</span></label>
                  <input type="tel" class="form-control" formControlName="phone"
                         placeholder="+91 98765 43210"
                         [class.error]="isInvalid('phone')"/>
                  @if (isInvalid('phone')) {
                    <span class="field-error">Phone number is required</span>
                  }
                </div>

                <div class="form-group">
                  <label>Address <span class="required">*</span></label>
                  <input type="text" class="form-control" formControlName="address"
                         placeholder="Street, City, State, Country"
                         [class.error]="isInvalid('address')"/>
                  @if (isInvalid('address')) {
                    <span class="field-error">Address is required</span>
                  }
                </div>

                <div class="form-group">
                  <label>Date of Birth <span class="required">*</span></label>
                  <input type="date" class="form-control" formControlName="dateOfBirth"
                         [class.error]="isInvalid('dateOfBirth')"/>
                  @if (isInvalid('dateOfBirth')) {
                    <span class="field-error">Date of birth is required</span>
                  }
                </div>
              </div>

              @if (profileSuccess()) {
                <div class="alert-success">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M13 4l-7 7-3-3"/></svg>
                  {{ profileSuccess() }}
                </div>
              }
              @if (profileError()) {
                <div class="alert-error">{{ profileError() }}</div>
              }

              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="cancelEdit()">Cancel</button>
                <button type="submit" class="btn btn-primary" [disabled]="savingProfile()">
                  @if (savingProfile()) { <span class="spinner-sm"></span> }
                  Save & Continue
                </button>
              </div>
            </form>
          }
        </div>

        <!-- RIGHT: KYC Section ──────────────────────────────────────────── -->
        <div class="kyc-column">

          <!-- KYC DOCUMENT SUBMISSION ──────────────── -->
          <div class="card">
            <div class="section-head">
              <div>
                <h3 class="title-md">KYC Verification</h3>
                <p class="label-sm text-muted" style="margin-top:4px;">
                  Identity verification for full platform access
                </p>
              </div>
              <span class="badge" [class]="kycBadgeClass()">{{ kycStatusLabel() }}</span>
            </div>

            <!-- State: personal details incomplete -->
            @if (!personalDetailsDone()) {
              <div class="kyc-blocked">
                <div class="kyc-blocked-icon">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="14" width="20" height="14" rx="2"/><path d="M11 14v-4a5 5 0 0110 0v4"/><circle cx="16" cy="21" r="1.5" fill="currentColor" stroke="none"/></svg>
                </div>
                <p class="title-sm">Complete personal details first</p>
                <p class="body-sm text-muted">Fill in your name, phone, address and date of birth before submitting KYC documents.</p>
              </div>

            <!-- State: not submitted yet -->
            } @else if (kycStatus() === 'NotSubmitted') {
              <p class="body-sm text-muted" style="margin-bottom:20px;">
                Submit a government-issued identity document to verify your identity. Our compliance team reviews submissions within 1–2 business days.
              </p>

              <form [formGroup]="kycForm" (ngSubmit)="onSubmitKyc()">
                <div class="form-fields">
                  <div class="form-group">
                    <label>Document Type <span class="required">*</span></label>
                    <div class="doc-type-grid">
                      @for (dt of documentTypes; track dt.value) {
                        <label class="doc-type-option" [class.selected]="kycForm.get('documentType')?.value === dt.value">
                          <input type="radio" formControlName="documentType" [value]="dt.value" style="display:none"/>
                          <span class="doc-type-icon" [innerHTML]="dt.icon"></span>
                          <span class="doc-type-label">{{ dt.label }}</span>
                        </label>
                      }
                    </div>
                    @if (isKycInvalid('documentType')) {
                      <span class="field-error">Please select a document type</span>
                    }
                  </div>

                  <div class="form-group">
                    <label>Document Number <span class="required">*</span></label>
                    <input type="text" class="form-control" formControlName="documentNumber"
                           [placeholder]="docNumberPlaceholder()"
                           [class.error]="isKycInvalid('documentNumber')"/>
                    @if (isKycInvalid('documentNumber')) {
                      <span class="field-error">Document number is required</span>
                    }
                  </div>

                  <div class="form-group">
                    <label>Full Name on Document <span class="required">*</span></label>
                    <input type="text" class="form-control" formControlName="nameOnDocument"
                           placeholder="As it appears on the document"
                           [class.error]="isKycInvalid('nameOnDocument')"/>
                    @if (isKycInvalid('nameOnDocument')) {
                      <span class="field-error">Name on document is required</span>
                    }
                  </div>
                </div>

                <div class="kyc-consent">
                  <label class="consent-label">
                    <input type="checkbox" formControlName="consent"/>
                    <span>I confirm that the information provided is accurate and the document belongs to me.</span>
                  </label>
                  @if (isKycInvalid('consent')) {
                    <span class="field-error">You must confirm this to proceed</span>
                  }
                </div>

                @if (kycError()) {
                  <div class="alert-error" style="margin-top:16px;">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8" r="7"/><path d="M8 5v3M8 11h.01"/></svg>
                    {{ kycError() }}
                  </div>
                }

                <button type="submit" class="btn btn-primary" style="width:100%;margin-top:20px;" [disabled]="submittingKyc()">
                  @if (submittingKyc()) {
                    <span class="spinner-sm"></span> Submitting...
                  } @else {
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2L2 6l5 3 3 5 4-12z"/></svg>
                    Submit for Review
                  }
                </button>
              </form>

            <!-- State: pending review -->
            } @else if (kycStatus() === 'Pending') {
              <div class="kyc-status-card pending">
                <div class="ksc-icon">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="14" cy="14" r="11"/><path d="M14 8v6l4 2"/></svg>
                </div>
                <div>
                  <p class="title-sm">Under Review</p>
                  <p class="body-sm" style="margin-top:4px;">Your documents have been submitted and are being reviewed by our compliance team. You'll be notified once a decision is made.</p>
                </div>
              </div>

              <div class="submitted-details">
                <p class="label-sm text-muted" style="margin-bottom:12px;">SUBMITTED INFORMATION</p>
                <div class="info-table">
                  <div class="info-row">
                    <span class="label-md text-muted">Document Type</span>
                    <span class="title-sm">{{ kycForm.get('documentType')?.value || 'On file' }}</span>
                  </div>
                  <div class="info-row">
                    <span class="label-md text-muted">Status</span>
                    <span class="badge badge-warning">Pending Review</span>
                  </div>
                </div>
              </div>

            <!-- State: approved -->
            } @else if (kycStatus() === 'Approved') {
              <div class="kyc-status-card approved">
                <div class="ksc-icon">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="14" cy="14" r="11"/><path d="M9 14l4 4 6-8"/></svg>
                </div>
                <div>
                  <p class="title-sm">Identity Verified</p>
                  <p class="body-sm" style="margin-top:4px;">Your identity has been verified. You now have full access to all platform features including higher transaction limits.</p>
                </div>
              </div>

              <div class="verified-perks">
                @for (perk of verifiedPerks; track perk.label) {
                  <div class="perk-item">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round"><path d="M13 4l-7 7-3-3"/></svg>
                    <span class="label-md">{{ perk.label }}</span>
                  </div>
                }
              </div>

            <!-- State: rejected -->
            } @else if (kycStatus() === 'Rejected') {
              <div class="kyc-status-card rejected">
                <div class="ksc-icon">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="14" cy="14" r="11"/><path d="M17 11l-6 6M11 11l6 6"/></svg>
                </div>
                <div>
                  <p class="title-sm">Verification Rejected</p>
                  <p class="body-sm" style="margin-top:4px;">Your KYC submission was rejected. Please review the reason below and contact support to resubmit.</p>
                </div>
              </div>

              <div class="rejection-reason">
                <p class="label-sm text-muted">REJECTION REASON</p>
                <p class="body-sm" style="margin-top:8px; font-style:italic;">
                  {{ rejectionReason() || 'No specific reason provided. Please contact support for details.' }}
                </p>
              </div>

              <div class="rejected-actions">
                <a href="mailto:support@aurelianfinance.com" class="btn btn-secondary btn-sm">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="1" y="3" width="12" height="9" rx="1"/><path d="M1 4l6 4 6-4"/></svg>
                  Contact Support
                </a>
              </div>
            }
          </div>

          <!-- What's needed info box -->
          @if (kycStatus() === 'NotSubmitted' && personalDetailsDone()) {
            <div class="card info-box">
              <p class="label-sm text-muted" style="margin-bottom:12px;">ACCEPTED DOCUMENTS</p>
              <div class="doc-list">
                <div class="doc-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="1" width="12" height="14" rx="1"/><path d="M5 5h6M5 8h6M5 11h4"/></svg>
                  <span class="label-md">Aadhaar Card (India)</span>
                </div>
                <div class="doc-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="14" height="10" rx="1"/><circle cx="5" cy="8" r="1.5"/><path d="M8 6h4M8 10h4"/></svg>
                  <span class="label-md">Passport</span>
                </div>
                <div class="doc-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="14" height="10" rx="1"/><path d="M1 7h14"/><path d="M4 10h3M9 10h3"/></svg>
                  <span class="label-md">PAN Card</span>
                </div>
                <div class="doc-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="14" height="10" rx="1"/><path d="M4 8h8M6 5l-2 6"/></svg>
                  <span class="label-md">Driver's Licence</span>
                </div>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- ── Security Section ────────────────────────────────────────── -->
      <div class="card security-card" style="margin-top: 20px;">
        <div class="section-head">
          <div>
            <h3 class="title-md">Security</h3>
            <p class="label-sm text-muted" style="margin-top:4px;">Manage your password and account security</p>
          </div>
          <button class="btn btn-secondary btn-sm" (click)="togglePasswordSection()">
            {{ showPasswordSection() ? 'Cancel' : 'Change Password' }}
          </button>
        </div>

        @if (showPasswordSection()) {
          <form [formGroup]="passwordForm" (ngSubmit)="onChangePassword()" style="max-width:480px;margin-top:16px;">
            <div class="form-fields">
              <div class="form-group">
                <label>Current Password <span class="required">*</span></label>
                <input type="password" class="form-control" formControlName="currentPassword"
                       placeholder="Enter current password"
                       [class.error]="passwordForm.get('currentPassword')?.invalid && passwordForm.get('currentPassword')?.touched"/>
              </div>
              <div class="form-group">
                <label>New Password <span class="required">*</span></label>
                <input type="password" class="form-control" formControlName="newPassword"
                       placeholder="Min. 8 characters"
                       [class.error]="passwordForm.get('newPassword')?.invalid && passwordForm.get('newPassword')?.touched"/>
                @if (passwordForm.get('newPassword')?.invalid && passwordForm.get('newPassword')?.touched) {
                  <span class="field-error">New password must be at least 8 characters</span>
                }
              </div>
              <div class="form-group">
                <label>Confirm New Password <span class="required">*</span></label>
                <input type="password" class="form-control" formControlName="confirmPassword"
                       placeholder="Repeat new password"
                       [class.error]="passwordForm.get('confirmPassword')?.invalid && passwordForm.get('confirmPassword')?.touched"/>
              </div>
            </div>

            @if (passwordSuccess()) {
              <div class="alert-success" style="margin-top:12px;">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M13 4l-7 7-3-3"/></svg>
                {{ passwordSuccess() }}
              </div>
            }
            @if (passwordError()) {
              <div class="alert-error" style="margin-top:12px;">{{ passwordError() }}</div>
            }

            <div class="form-actions" style="margin-top:16px;">
              <button type="submit" class="btn btn-primary" [disabled]="changingPassword()">
                @if (changingPassword()) { <span class="spinner-sm"></span> }
                Update Password
              </button>
            </div>
          </form>
        } @else {
          <p class="body-sm text-muted" style="margin-top:8px;">Use a strong, unique password to protect your account.</p>
        }
      </div>

    </div>
  `,
  styles: [`
    .profile-page { max-width: 1060px; }

    .page-header {
      display: flex;
      align-items: flex-end;
      margin-bottom: 24px;
      h1 { margin-top: 4px; }
    }

    // ── Avatar card ───────────────────────────────────────────────────────
    .avatar-card {
      margin-bottom: 24px;
      padding: 28px 32px 0;
    }

    .avatar-wrap {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 28px;
    }

    .avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--primary-container));
      color: white;
      font-family: var(--font-display);
      font-size: 26px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .avatar-info {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .badge-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
      margin-top: 2px;
    }

    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      display: inline-block;
      margin-right: 2px;
    }

    // ── KYC progress strip ─────────────────────────────────────────────────
    .kyc-progress-strip {
      display: flex;
      align-items: center;
      padding: 20px 0 24px;
      border-top: 1px solid rgba(200,197,192,0.25);
    }

    .progress-step {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    .ps-circle {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 2px solid var(--outline-variant);
      background: var(--surface-container);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      color: var(--on-surface-variant);
      transition: all 0.2s;

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

    .ps-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--on-surface-variant);

      .done & , .active & { color: var(--on-surface); }
    }

    .ps-line {
      flex: 1;
      height: 2px;
      background: var(--outline-variant);
      margin: 0 12px;
      border-radius: 2px;
      transition: background 0.3s;

      &.done { background: var(--success); }
    }

    // ── Main grid ──────────────────────────────────────────────────────────
    .main-grid {
      display: grid;
      grid-template-columns: 1fr 420px;
      gap: 20px;
      align-items: start;

      @media (max-width: 960px) { grid-template-columns: 1fr; }
    }

    .kyc-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    // ── Section head ───────────────────────────────────────────────────────
    .section-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    // ── Info table ─────────────────────────────────────────────────────────
    .info-table {
      display: flex;
      flex-direction: column;
    }

    .info-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 13px 0;

      & + & { border-top: 1px solid rgba(200,197,192,0.25); }

      .empty { color: var(--on-surface-variant); font-style: italic; }
    }

    // ── Form ───────────────────────────────────────────────────────────────
    .form-fields {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .required { color: var(--primary); font-size: 14px; }

    .form-actions {
      display: flex;
      gap: 12px;
      margin-top: 20px;
    }

    // ── Incomplete notice ──────────────────────────────────────────────────
    .incomplete-notice {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: var(--warning-container);
      color: var(--warning);
      padding: 14px 16px;
      border-radius: var(--radius-md);
      margin-bottom: 20px;
    }

    // ── KYC document type grid ─────────────────────────────────────────────
    .doc-type-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 6px;
    }

    .doc-type-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 14px 10px;
      border-radius: var(--radius-md);
      background: var(--surface-container-low);
      cursor: pointer;
      transition: all 0.15s;
      border: 2px solid transparent;
      text-align: center;

      &:hover { background: var(--surface-container); }

      &.selected {
        background: var(--primary-fixed);
        border-color: var(--primary);
      }
    }

    .doc-type-icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary);
    }

    .doc-type-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.02em;
      color: var(--on-surface);
    }

    // ── KYC consent ────────────────────────────────────────────────────────
    .kyc-consent {
      margin-top: 16px;
      padding: 14px 16px;
      background: var(--surface-container-low);
      border-radius: var(--radius-md);
    }

    .consent-label {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      cursor: pointer;
      font-size: 13px;
      line-height: 1.5;
      color: var(--on-surface-variant);

      input[type="checkbox"] {
        margin-top: 2px;
        accent-color: var(--primary);
        width: 15px;
        height: 15px;
        flex-shrink: 0;
      }
    }

    // ── KYC blocked state ──────────────────────────────────────────────────
    .kyc-blocked {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 10px;
      padding: 32px 20px;
      color: var(--on-surface-variant);
    }

    .kyc-blocked-icon {
      width: 64px;
      height: 64px;
      background: var(--surface-container-low);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    // ── KYC status cards ───────────────────────────────────────────────────
    .kyc-status-card {
      display: flex;
      gap: 14px;
      padding: 18px;
      border-radius: var(--radius-md);
      margin-bottom: 20px;
      align-items: flex-start;

      &.pending  { background: var(--warning-container); color: var(--warning); }
      &.approved { background: var(--success-container); color: var(--success); }
      &.rejected { background: var(--error-container); color: var(--error); }
    }

    .ksc-icon {
      flex-shrink: 0;
      margin-top: 2px;
    }

    // ── Submitted details (pending state) ──────────────────────────────────
    .submitted-details {
      padding-top: 16px;
      border-top: 1px solid rgba(200,197,192,0.25);
    }

    // ── Verified perks ─────────────────────────────────────────────────────
    .verified-perks {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 4px;
    }

    .perk-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      color: var(--on-surface);
    }

    // ── Rejection reason ───────────────────────────────────────────────────
    .rejection-reason {
      padding: 14px 16px;
      background: var(--surface-container-low);
      border-radius: var(--radius-md);
      margin: 16px 0;
    }

    .rejected-actions { display: flex; gap: 10px; }

    // ── Info box (accepted docs) ───────────────────────────────────────────
    .info-box { padding: 20px 24px; }

    .doc-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .doc-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
    }

    // ── Alerts ─────────────────────────────────────────────────────────────
    .alert-success, .alert-error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border-radius: var(--radius-md);
      font-size: 14px;
      margin-top: 14px;
    }
    .alert-success { background: var(--success-container); color: var(--success); }
    .alert-error   { background: var(--error-container);   color: var(--error); }

    .spinner-sm {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class ProfileComponent implements OnInit {
  private profileSvc = inject(ProfileService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  profile = signal<UserProfile | null>(null);
  editMode = signal(false);
  savingProfile = signal(false);
  submittingKyc = signal(false);
  profileSuccess = signal<string | null>(null);
  profileError = signal<string | null>(null);
  kycError = signal<string | null>(null);
  rejectionReason = signal<string | null>(null);

  // Security section
  showPasswordSection = signal(false);
  changingPassword = signal(false);
  passwordSuccess = signal<string | null>(null);
  passwordError = signal<string | null>(null);

  passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword:     ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  });

  togglePasswordSection(): void {
    this.showPasswordSection.update(v => !v);
    this.passwordForm.reset();
    this.passwordSuccess.set(null);
    this.passwordError.set(null);
  }

  onChangePassword(): void {
    if (this.passwordForm.invalid) { this.passwordForm.markAllAsTouched(); return; }
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;
    if (newPassword !== confirmPassword) {
      this.passwordError.set('New passwords do not match.');
      return;
    }
    this.changingPassword.set(true);
    this.passwordError.set(null);
    this.auth.changePassword({ currentPassword: currentPassword!, newPassword: newPassword! }).subscribe({
      next: () => {
        this.changingPassword.set(false);
        this.passwordSuccess.set('Password changed successfully.');
        this.passwordForm.reset();
      },
      error: err => {
        this.changingPassword.set(false);
        this.passwordError.set(err.error?.error ?? 'Failed to change password.');
      }
    });
  }

  initials = computed(() => {
    const name = this.profile()?.fullName ?? '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  });

  kycStatus = computed(() => this.profile()?.kycStatus ?? 'NotSubmitted');

  personalDetailsDone = computed(() => {
    const p = this.profile();
    return !!(p?.fullName && p?.phone && p?.address && p?.dateOfBirth);
  });

  kycDocSubmitted = computed(() => {
    const s = this.kycStatus();
    return s === 'Pending' || s === 'Approved' || s === 'Rejected';
  });

  kycApproved = computed(() => this.kycStatus() === 'Approved');

  activeKycStep = computed((): KycStep => {
    if (!this.personalDetailsDone()) return 'personal';
    if (!this.kycDocSubmitted()) return 'document';
    return 'status';
  });

  documentTypes = [
    {
      value: 'Aadhaar',
      label: 'Aadhaar',
      icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="3" width="18" height="16" rx="2"/><circle cx="8" cy="11" r="2.5"/><path d="M13 8h4M13 11h4M13 14h2"/></svg>`
    },
    {
      value: 'Passport',
      label: 'Passport',
      icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="4" y="1" width="14" height="20" rx="2"/><circle cx="11" cy="10" r="3"/><path d="M7 16h8M8 18h6"/></svg>`
    },
    {
      value: 'PAN',
      label: 'PAN Card',
      icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="1" y="4" width="20" height="14" rx="2"/><path d="M1 9h20"/><path d="M5 14h4M11 14h6"/></svg>`
    },
    {
      value: 'DriversLicense',
      label: "Driver's Licence",
      icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="1" y="4" width="20" height="14" rx="2"/><circle cx="7" cy="12" r="2"/><path d="M11 9h6M11 12h4M11 15h6"/></svg>`
    },
    {
      value: 'VoterId',
      label: "Voter ID",
      icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="3" width="18" height="16" rx="2"/><path d="M7 11l3 3 5-6"/></svg>`
    },
    {
      value: 'NationalID',
      label: "National ID",
      icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="1" y="4" width="20" height="14" rx="2"/><circle cx="7" cy="11" r="2"/><path d="M11 8h6M11 11h6M11 14h4"/></svg>`
    }
  ];

  verifiedPerks = [
    { label: 'Increased transaction limits' },
    { label: 'Faster withdrawal processing' },
    { label: 'Access to premium financial products' },
    { label: 'Enhanced account security status' }
  ];

  profileForm = this.fb.group({
    fullName:    ['', [Validators.required, Validators.minLength(2)]],
    phone:       ['', Validators.required],
    address:     ['', Validators.required],
    dateOfBirth: ['', Validators.required]
  });

  kycForm = this.fb.group({
    documentType:   ['', Validators.required],
    documentNumber: ['', Validators.required],
    nameOnDocument: ['', Validators.required],
    consent:        [false, Validators.requiredTrue]
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.profileSvc.getProfile().subscribe({
      next: p => {
        this.profile.set(p);
        this.profileForm.patchValue({
          fullName:    p.fullName ?? '',
          phone:       p.phone    ?? '',
          address:     p.address  ?? '',
          dateOfBirth: p.dateOfBirth ?? ''
        });
        // Pre-fill name on document
        this.kycForm.patchValue({ nameOnDocument: p.fullName ?? '' });
      }
    });
  }

  startEdit(): void {
    this.profileSuccess.set(null);
    this.profileError.set(null);
    this.editMode.set(true);
  }

  cancelEdit(): void {
    this.editMode.set(false);
    const p = this.profile();
    if (p) {
      this.profileForm.patchValue({
        fullName: p.fullName, phone: p.phone ?? '',
        address: p.address ?? '', dateOfBirth: p.dateOfBirth ?? ''
      });
    }
  }

  onSaveProfile(): void {
    if (this.profileForm.invalid) { this.profileForm.markAllAsTouched(); return; }
    this.savingProfile.set(true);
    this.profileError.set(null);
    const { fullName, phone, address, dateOfBirth } = this.profileForm.value;
    this.profileSvc.updateProfile({
      fullName: fullName || undefined,
      phone: phone || undefined,
      address: address || undefined,
      dateOfBirth: dateOfBirth || undefined
    }).subscribe({
      next: p => {
        this.profile.set(p);
        this.savingProfile.set(false);
        this.editMode.set(false);
        this.profileSuccess.set('Profile saved successfully.');
        this.kycForm.patchValue({ nameOnDocument: p.fullName });
      },
      error: err => {
        this.profileError.set(err.error?.error ?? 'Failed to save profile.');
        this.savingProfile.set(false);
      }
    });
  }

  onSubmitKyc(): void {
    if (this.kycForm.invalid) { this.kycForm.markAllAsTouched(); return; }
    this.submittingKyc.set(true);
    this.kycError.set(null);
    const { documentType, documentNumber } = this.kycForm.value;
    this.profileSvc.submitKyc({
      documentType: documentType!,
      documentNumber: documentNumber!
    }).subscribe({
      next: () => {
        this.submittingKyc.set(false);
        this.profile.update(p => p ? { ...p, kycStatus: 'Pending' as KycStatus } : p);
      },
      error: err => {
        this.kycError.set(err.error?.error ?? 'Submission failed. Please try again.');
        this.submittingKyc.set(false);
      }
    });
  }

  docNumberPlaceholder(): string {
    const map: Record<string, string> = {
      Aadhaar: 'e.g. 1234 5678 9012',
      Passport: 'e.g. A1234567',
      PAN: 'e.g. ABCDE1234F',
      DriversLicense: 'e.g. DL-1234567890123',
      VoterId: 'e.g. ABC1234567',
      NationalID: 'e.g. 1234567890'
    };
    return map[this.kycForm.get('documentType')?.value ?? ''] ?? 'Enter document number';
  }

  isInvalid(field: string): boolean {
    const c = this.profileForm.get(field);
    return !!(c?.invalid && c?.touched);
  }

  isKycInvalid(field: string): boolean {
    const c = this.kycForm.get(field);
    return !!(c?.invalid && c?.touched);
  }

  kycStatusLabel(): string {
    const map: Record<KycStatus, string> = {
      NotSubmitted: 'Not Submitted',
      Pending: 'Pending Review',
      Approved: 'Verified',
      Rejected: 'Rejected'
    };
    return map[this.kycStatus()] ?? 'Unknown';
  }

  kycBadgeClass(): string {
    const map: Record<KycStatus, string> = {
      Approved: 'badge badge-success',
      Pending: 'badge badge-warning',
      Rejected: 'badge badge-error',
      NotSubmitted: 'badge badge-neutral'
    };
    return map[this.kycStatus()] ?? 'badge badge-neutral';
  }
}
