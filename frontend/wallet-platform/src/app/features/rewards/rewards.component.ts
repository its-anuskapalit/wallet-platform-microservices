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
  templateUrl: './rewards.component.html',
  styleUrls: ['./rewards.component.scss']
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
