import { Injectable, signal, effect } from '@angular/core';

const STORAGE_KEY = 'wallet_balance_visible';

@Injectable({ providedIn: 'root' })
export class BalanceVisibilityService {
  private readonly _visible = signal(this.loadInitial());

  /** When true, balances show normally; when false, show masked placeholder. */
  readonly visible = this._visible.asReadonly();

  constructor() {
    effect(() => {
      localStorage.setItem(STORAGE_KEY, this._visible() ? '1' : '0');
    });
  }

  private loadInitial(): boolean {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === '0' || v === 'false') return false;
    return true;
  }

  toggle(): void {
    this._visible.update(x => !x);
  }

  /** Masked string for hero / stat cards (e.g. ₹ ••••••••). */
  maskedAmount(currency: string | null | undefined): string {
    const c = (currency || 'INR').toUpperCase();
    if (c === 'INR') return '₹ ••••••••';
    if (c === 'USD') return '$ ••••••••';
    return `${c} ••••••••`;
  }
}
