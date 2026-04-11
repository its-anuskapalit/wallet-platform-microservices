import { Injectable, signal, inject } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class WalletNicknameService {
  private auth = inject(AuthService);

  private key(): string {
    return `wallet-nickname-${this.auth.currentUser()?.userId ?? 'default'}`;
  }

  nickname = signal<string>(this.load());

  private load(): string {
    return localStorage.getItem(`wallet-nickname-${JSON.parse(localStorage.getItem('current_user') ?? '{}')?.userId ?? 'default'}`) ?? '';
  }

  save(name: string): void {
    const trimmed = name.trim().slice(0, 40);
    localStorage.setItem(this.key(), trimmed);
    this.nickname.set(trimmed);
  }

  clear(): void {
    localStorage.removeItem(this.key());
    this.nickname.set('');
  }
}
