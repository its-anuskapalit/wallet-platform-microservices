import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { RewardsService } from '../../core/services/rewards.service';
import { RewardsAccount, PointsHistory, CatalogItem, Redemption } from '../../core/models/rewards.models';

type Tab = 'catalog' | 'history' | 'redemptions';

const CATEGORY_ICONS: Record<string, string> = {
  'Voucher':     'M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z',
  'Cashback':    'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
  'Food':        'M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3',
  'Travel':      'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.81 19.79 19.79 0 01.93 2.18 2 2 0 012.91.04h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 6.91a16 16 0 006 6l.58-1.58a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 13.92v3z',
  'Shopping':    'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0',
  'Entertainment':'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Voucher':       '#fff3e0',
  'Cashback':      '#e8f5e9',
  'Food':          '#fce4ec',
  'Travel':        '#e3f2fd',
  'Shopping':      '#f3e5f5',
  'Entertainment': '#e8eaf6',
};

const CATEGORY_TEXT: Record<string, string> = {
  'Voucher':       '#e65100',
  'Cashback':      '#2e7d32',
  'Food':          '#c62828',
  'Travel':        '#1565c0',
  'Shopping':      '#6a1b9a',
  'Entertainment': '#283593',
};

@Component({
  selector: 'app-rewards',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe],
  template: `
    <div class="rewards-page page-enter">
      <div class="page-header">
        <div>
          <p class="label-sm text-muted">LOYALTY</p>
          <h1 class="headline-lg">Rewards</h1>
        </div>
      </div>

      <!-- Rewards Hero -->
      @if (loadingRewards()) {
        <div class="skeleton" style="height: 160px; border-radius: 24px; margin-bottom: 28px;"></div>
      } @else {
        <div class="rewards-hero">
          <div class="rewards-hero-left">
            <p class="rewards-hero-label">Available Points</p>
            <div class="rewards-hero-points">{{ rewards()?.availablePoints ?? 0 | number }}</div>
            <div class="tier-badge">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.67 3.39L12.5 5.05l-2.75 2.68.65 3.77L7 9.69l-3.4 1.81.65-3.77L1.5 5.05l3.83-.66z" fill="currentColor"/></svg>
              {{ rewards()?.tier ?? 'Standard' }} Tier
            </div>
          </div>
          <div class="rewards-hero-right">
            <div class="progress-ring-wrap">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="8"/>
                <circle cx="60" cy="60" r="50" fill="none" stroke="white" stroke-width="8"
                  stroke-linecap="round"
                  [attr.stroke-dasharray]="314"
                  [attr.stroke-dashoffset]="314 - (314 * progressPct() / 100)"
                  transform="rotate(-90 60 60)"
                  style="transition: stroke-dashoffset 1s ease;"
                />
              </svg>
              <div class="ring-label">
                <span class="ring-pct">{{ progressPct() }}%</span>
                <span class="ring-sub">to next tier</span>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Tabs -->
      <div class="tabs-bar">
        <button class="tab-btn" [class.active]="tab() === 'catalog'" (click)="tab.set('catalog')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7"/></svg>
          Catalog
        </button>
        <button class="tab-btn" [class.active]="tab() === 'history'" (click)="tab.set('history')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2l2.15 4.35L16 7.28l-3.5 3.41.83 4.81L9 13.13 5.67 15.5l.83-4.81L3 7.28l4.85-.93z"/></svg>
          Points History
        </button>
        <button class="tab-btn" [class.active]="tab() === 'redemptions'" (click)="loadRedemptions()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
          My Redemptions
        </button>
      </div>

      <!-- Catalog Tab -->
      @if (tab() === 'catalog') {
        @if (selectedCategory()) {
          <div class="filter-bar">
            <span class="filter-label">Category:</span>
            <span class="filter-chip">
              {{ selectedCategory() }}
              <button (click)="selectedCategory.set(null)" class="chip-remove">×</button>
            </span>
          </div>
        }
        <div class="category-pills">
          @for (cat of categories(); track cat) {
            <button class="pill" [class.active]="selectedCategory() === cat" (click)="toggleCategory(cat)">
              {{ cat }}
            </button>
          }
        </div>

        @if (loadingCatalog()) {
          <div class="catalog-grid">
            @for (i of [1,2,3,4,5,6]; track i) {
              <div class="skeleton" style="height: 210px; border-radius: 20px;"></div>
            }
          </div>
        } @else if (filteredCatalog().length === 0) {
          <div class="empty-state">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--outline-variant)" stroke-width="1.2" stroke-linecap="round"><path d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
            <p class="body-md text-muted">No catalog items available</p>
          </div>
        } @else {
          <div class="catalog-grid">
            @for (item of filteredCatalog(); track item.id) {
              <div class="catalog-card" [class.unavailable]="!canRedeem(item)">
                <div class="catalog-icon-wrap"
                     [style.background]="categoryBg(item.category)"
                     [style.color]="categoryText(item.category)">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path [attr.d]="categoryIcon(item.category)"/>
                  </svg>
                </div>

                <div class="cat-pill-sm"
                     [style.background]="categoryBg(item.category)"
                     [style.color]="categoryText(item.category)">
                  {{ item.category }}
                </div>

                <div class="catalog-name title-sm">{{ item.name }}</div>
                <div class="catalog-desc label-sm text-muted">{{ item.description }}</div>

                <div class="stock-row">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  @if (item.stock > 10) {
                    <span class="stock-ok">In stock</span>
                  } @else if (item.stock > 0) {
                    <span class="stock-low">Only {{ item.stock }} left!</span>
                  } @else {
                    <span class="stock-out">Out of stock</span>
                  }
                </div>

                <div class="catalog-footer">
                  <div class="points-cost-wrap">
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.67 3.39L12.5 5.05l-2.75 2.68.65 3.77L7 9.69l-3.4 1.81.65-3.77L1.5 5.05l3.83-.66z" fill="var(--primary)"/></svg>
                    <span class="points-cost">{{ item.pointsRequired | number }} pts</span>
                  </div>
                  <button
                    class="btn btn-primary btn-sm"
                    [disabled]="!canRedeem(item) || redeeming() === item.id"
                    (click)="redeem(item)"
                  >
                    @if (redeeming() === item.id) {
                      <span class="spinner-xs"></span>
                    }
                    Redeem
                  </button>
                </div>

                @if (!canRedeem(item) && item.stock > 0) {
                  <div class="need-more-pts label-sm">
                    Need {{ (item.pointsRequired - (rewards()?.availablePoints ?? 0)) | number }} more pts
                  </div>
                }
              </div>
            }
          </div>
        }
      }

      <!-- Points History Tab -->
      @if (tab() === 'history') {
        <div class="card">
          <h3 class="title-md" style="margin-bottom: 20px;">Points History</h3>
          @if (loadingHistory()) {
            @for (i of [1,2,3,4,5]; track i) {
              <div class="history-skeleton">
                <div class="skeleton" style="width: 40px; height: 40px; border-radius: 12px;"></div>
                <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
                  <div class="skeleton" style="height: 13px; width: 55%;"></div>
                  <div class="skeleton" style="height: 11px; width: 35%;"></div>
                </div>
                <div class="skeleton" style="height: 18px; width: 60px;"></div>
              </div>
            }
          } @else if (history().length === 0) {
            <div class="empty-state">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--outline-variant)" stroke-width="1.2"><path d="M9 2l2.15 4.35L16 7.28l-3.5 3.41.83 4.81L9 13.13 5.67 15.5l.83-4.81L3 7.28l4.85-.93z"/></svg>
              <p class="body-sm text-muted">No points history yet</p>
            </div>
          } @else {
            <div class="list-spaced">
              @for (h of history(); track h.transactionId) {
                <div class="history-item">
                  <div class="history-icon" [class.deduct]="h.points < 0">
                    @if (h.points > 0) {
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 2l2.15 4.35L16 7.28l-3.5 3.41.83 4.81L9 13.13 5.67 15.5l.83-4.81L3 7.28l4.85-.93z" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    } @else {
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7"/></svg>
                    }
                  </div>
                  <div class="history-info">
                    <span class="title-sm">{{ h.description }}</span>
                    <span class="label-sm text-muted">{{ h.createdAt | date:'MMM d, h:mm a' }}</span>
                  </div>
                  <span class="points-badge" [class.positive]="h.points > 0" [class.negative]="h.points < 0">
                    {{ h.points > 0 ? '+' : '' }}{{ h.points | number }} pts
                  </span>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- My Redemptions Tab -->
      @if (tab() === 'redemptions') {
        <div class="card">
          <h3 class="title-md" style="margin-bottom: 20px;">My Redemptions</h3>
          @if (loadingRedemptions()) {
            @for (i of [1,2,3]; track i) {
              <div class="redemption-skeleton">
                <div class="skeleton" style="width:44px;height:44px;border-radius:12px;"></div>
                <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
                  <div class="skeleton" style="height:13px;width:50%;"></div>
                  <div class="skeleton" style="height:11px;width:35%;"></div>
                </div>
                <div class="skeleton" style="height:32px;width:120px;border-radius:8px;"></div>
              </div>
            }
          } @else if (myRedemptions().length === 0) {
            <div class="empty-state">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--outline-variant)" stroke-width="1.2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
              <p class="body-sm text-muted">No redemptions yet. Visit the Catalog to redeem!</p>
            </div>
          } @else {
            <div class="redemptions-list">
              @for (r of myRedemptions(); track r.id) {
                <div class="redemption-row">
                  <div class="redemption-icon"
                       [style.background]="categoryBg(r.category)"
                       [style.color]="categoryText(r.category)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path [attr.d]="categoryIcon(r.category)"/>
                    </svg>
                  </div>
                  <div class="redemption-info">
                    <span class="title-sm">{{ r.itemName }}</span>
                    <span class="label-sm text-muted">{{ r.createdAt | date:'MMM d, yyyy · h:mm a' }} · {{ r.pointsUsed | number }} pts</span>
                  </div>
                  <div class="redemption-right">
                    <span class="status-chip" [class.completed]="r.status === 'Completed'" [class.pending]="r.status === 'Pending'">
                      {{ r.status }}
                    </span>
                    @if (r.voucherCode) {
                      <div class="voucher-chip" (click)="copyVoucher(r.voucherCode!)">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                        {{ r.voucherCode }}
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>

    <!-- Redemption Success Modal -->
    @if (successModal()) {
      <div class="modal-overlay" (click)="successModal.set(null)">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-check">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><path d="M6 16l7 7 13-13"/></svg>
          </div>
          <h3 class="title-lg" style="margin-top:16px;">Redeemed!</h3>
          <p class="body-sm text-muted" style="margin-top:6px;">{{ successModal()!.itemName }}</p>
          <p class="body-sm text-muted">{{ successModal()!.pointsUsed | number }} points deducted</p>

          @if (successModal()!.voucherCode) {
            <div class="voucher-display">
              <p class="label-sm text-muted" style="margin-bottom:8px;">YOUR VOUCHER CODE</p>
              <div class="voucher-code-big">{{ successModal()!.voucherCode }}</div>
              <button class="btn btn-secondary btn-sm" style="margin-top:10px;" (click)="copyVoucher(successModal()!.voucherCode!)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                Copy Code
              </button>
            </div>
            <p class="label-sm text-muted" style="margin-top:10px;">Save this code — it's your proof of redemption.</p>
          }

          <button class="btn btn-primary" style="margin-top:20px;width:100%;" (click)="successModal.set(null)">Done</button>
        </div>
      </div>
    }
  `,
  styles: [`
    .rewards-page { max-width: 1100px; }

    .page-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-bottom: 24px;
      h1 { margin-top: 4px; }
    }

    /* Hero */
    .rewards-hero {
      border-radius: var(--radius-xl);
      background: linear-gradient(135deg, #7a3900 0%, var(--primary) 50%, var(--primary-container) 100%);
      padding: 32px;
      color: white;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 12px 48px rgba(148, 74, 0, 0.3);
    }
    .rewards-hero-label {
      font-size: 13px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.7);
      margin-bottom: 8px;
    }
    .rewards-hero-points {
      font-family: var(--font-display);
      font-size: 3rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 12px;
    }
    .tier-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.2);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
    }
    .progress-ring-wrap {
      position: relative;
      width: 120px;
      height: 120px;
      .ring-label {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
    }
    .ring-pct { font-family: var(--font-display); font-size: 22px; font-weight: 700; }
    .ring-sub { font-size: 11px; color: rgba(255,255,255,0.7); }

    /* Tabs */
    .tabs-bar {
      display: flex;
      gap: 4px;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--outline-variant);
      padding-bottom: 0;
    }
    .tab-btn {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 10px 18px;
      border: none;
      background: none;
      font-size: 14px;
      font-weight: 500;
      color: var(--on-surface-variant);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: color 0.15s, border-color 0.15s;

      &:hover { color: var(--on-surface); }
      &.active {
        color: var(--primary);
        border-bottom-color: var(--primary);
      }
    }

    /* Category pills */
    .category-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 20px;
    }
    .pill {
      padding: 5px 14px;
      border-radius: 20px;
      border: 1.5px solid var(--outline-variant);
      background: none;
      font-size: 13px;
      font-weight: 500;
      color: var(--on-surface-variant);
      cursor: pointer;
      transition: all 0.15s;
      &:hover { border-color: var(--primary); color: var(--primary); }
      &.active { background: var(--primary); color: white; border-color: var(--primary); }
    }

    .filter-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      font-size: 13px;
    }
    .filter-chip {
      display: flex;
      align-items: center;
      gap: 5px;
      background: var(--primary-container);
      color: var(--on-primary-container);
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 12px;
    }
    .chip-remove {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      font-size: 16px;
      line-height: 1;
      color: inherit;
    }

    /* Catalog Grid */
    .catalog-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
      gap: 16px;
    }

    .catalog-card {
      background: var(--surface-container-lowest);
      border-radius: var(--radius-lg);
      padding: 20px;
      box-shadow: var(--shadow-ambient);
      display: flex;
      flex-direction: column;
      gap: 7px;
      transition: transform 0.15s, box-shadow 0.15s;
      border: 1.5px solid transparent;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        border-color: var(--outline-variant);
      }

      &.unavailable { opacity: 0.65; }
    }

    .catalog-icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 2px;
    }

    .cat-pill-sm {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      width: fit-content;
    }

    .catalog-name { font-weight: 600; font-size: 14px; }
    .catalog-desc { flex: 1; line-height: 1.4; font-size: 12px; }

    .stock-row {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
    }
    .stock-ok { color: var(--success); font-weight: 500; }
    .stock-low { color: #f57c00; font-weight: 600; }
    .stock-out { color: var(--error); font-weight: 600; }

    .catalog-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 6px;
    }

    .points-cost-wrap {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .points-cost { font-size: 14px; font-weight: 700; color: var(--primary); }

    .need-more-pts {
      color: var(--error);
      font-size: 11px;
      text-align: center;
    }

    /* History */
    .history-skeleton, .history-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid var(--outline-variant);
      &:last-child { border-bottom: none; }
    }
    .history-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: #fff8e1;
      color: #f57f17;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      &.deduct { background: #fce4ec; color: #c62828; }
    }
    .history-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .points-badge {
      font-size: 13px;
      font-weight: 700;
      white-space: nowrap;
      &.positive { color: var(--success); }
      &.negative { color: var(--error); }
    }

    /* Redemptions */
    .redemptions-list { display: flex; flex-direction: column; gap: 12px; }
    .redemption-skeleton, .redemption-row {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px;
      border-radius: var(--radius-md);
      background: var(--surface-container-lowest);
      border: 1px solid var(--outline-variant);
    }
    .redemption-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .redemption-info { flex: 1; display: flex; flex-direction: column; gap: 3px; }
    .redemption-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }

    .status-chip {
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      background: var(--outline-variant);
      color: var(--on-surface-variant);
      &.completed { background: #e8f5e9; color: #2e7d32; }
      &.pending { background: #fff8e1; color: #f57f17; }
    }

    .voucher-chip {
      display: flex;
      align-items: center;
      gap: 5px;
      background: var(--primary-container);
      color: var(--on-primary-container);
      padding: 5px 10px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      font-family: monospace;
      cursor: pointer;
      transition: opacity 0.15s;
      letter-spacing: 0.05em;
      &:hover { opacity: 0.8; }
    }

    /* Empty state */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 52px 20px;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.15s ease;
    }
    .modal-card {
      background: var(--surface);
      border-radius: var(--radius-xl);
      padding: 36px 32px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      box-shadow: 0 24px 80px rgba(0,0,0,0.2);
      animation: slideUp 0.2s ease;
    }
    .modal-check {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: var(--success);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
    }
    .voucher-display {
      background: var(--surface-container-lowest);
      border: 2px dashed var(--outline-variant);
      border-radius: var(--radius-md);
      padding: 20px;
      margin-top: 20px;
    }
    .voucher-code-big {
      font-family: monospace;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.15em;
      color: var(--primary);
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    .spinner-xs {
      width: 12px;
      height: 12px;
      border: 1.5px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class RewardsComponent implements OnInit {
  private rewardsSvc = inject(RewardsService);

  tab = signal<Tab>('catalog');

  rewards = signal<RewardsAccount | null>(null);
  history = signal<PointsHistory[]>([]);
  catalog = signal<CatalogItem[]>([]);
  myRedemptions = signal<Redemption[]>([]);

  loadingRewards = signal(true);
  loadingHistory = signal(true);
  loadingCatalog = signal(true);
  loadingRedemptions = signal(false);

  redeeming = signal<string | null>(null);
  successModal = signal<Redemption | null>(null);
  selectedCategory = signal<string | null>(null);
  copied = signal(false);

  categories = () => [...new Set(this.catalog().map(c => c.category))].sort();

  filteredCatalog = () => {
    const cat = this.selectedCategory();
    return cat ? this.catalog().filter(c => c.category === cat) : this.catalog();
  };

  progressPct = () => {
    const pts = this.rewards()?.availablePoints ?? 0;
    return Math.min(Math.round((pts % 1000) / 10), 100);
  };

  ngOnInit(): void {
    this.rewardsSvc.getRewards().subscribe({
      next: r => { this.rewards.set(r); this.loadingRewards.set(false); },
      error: () => this.loadingRewards.set(false)
    });
    this.rewardsSvc.getHistory().subscribe({
      next: h => { this.history.set(h); this.loadingHistory.set(false); },
      error: () => this.loadingHistory.set(false)
    });
    this.rewardsSvc.getCatalog().subscribe({
      next: c => { this.catalog.set(c); this.loadingCatalog.set(false); },
      error: () => this.loadingCatalog.set(false)
    });
  }

  loadRedemptions(): void {
    this.tab.set('redemptions');
    if (this.myRedemptions().length > 0) return;
    this.loadingRedemptions.set(true);
    this.rewardsSvc.getMyRedemptions().subscribe({
      next: r => { this.myRedemptions.set(r); this.loadingRedemptions.set(false); },
      error: () => this.loadingRedemptions.set(false)
    });
  }

  toggleCategory(cat: string): void {
    this.selectedCategory.set(this.selectedCategory() === cat ? null : cat);
  }

  canRedeem(item: CatalogItem): boolean {
    return (this.rewards()?.availablePoints ?? 0) >= item.pointsRequired && item.isActive && item.stock > 0;
  }

  redeem(item: CatalogItem): void {
    this.redeeming.set(item.id);
    this.rewardsSvc.redeem({ catalogItemId: item.id }).subscribe({
      next: result => {
        this.redeeming.set(null);
        this.successModal.set(result);
        // Refresh points balance
        this.rewardsSvc.getRewards().subscribe(r => this.rewards.set(r));
        // Refresh catalog stock
        this.rewardsSvc.getCatalog().subscribe(c => this.catalog.set(c));
        // Refresh redemption history
        this.myRedemptions.set([]);
      },
      error: () => this.redeeming.set(null)
    });
  }

  copyVoucher(code: string): void {
    navigator.clipboard.writeText(code).catch(() => {});
  }

  categoryIcon(cat: string): string {
    return CATEGORY_ICONS[cat] ?? CATEGORY_ICONS['Voucher'];
  }

  categoryBg(cat: string): string {
    return CATEGORY_COLORS[cat] ?? '#f5f5f5';
  }

  categoryText(cat: string): string {
    return CATEGORY_TEXT[cat] ?? '#555';
  }
}
