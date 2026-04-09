import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Wallet, TopUpRequest, DeductRequest, FreezeRequest } from '../models/wallet.models';

@Injectable({ providedIn: 'root' })
export class WalletService {
  private readonly base = `${environment.apiGatewayUrl}/wallet`;

  constructor(private http: HttpClient) {}

  getWallet(): Observable<Wallet> {
    return this.http.get<Wallet>(this.base);
  }

  getWalletByUserId(userId: string): Observable<Wallet> {
    return this.http.get<Wallet>(`${this.base}/lookup/${userId}`);
  }

  topUp(dto: TopUpRequest): Observable<Wallet> {
    return this.http.post<Wallet>(`${this.base}/topup`, dto);
  }

  deduct(dto: DeductRequest): Observable<Wallet> {
    return this.http.post<Wallet>(`${this.base}/deduct`, dto);
  }

  freeze(dto: FreezeRequest): Observable<Wallet> {
    return this.http.post<Wallet>(`${this.base}/freeze`, dto);
  }

  unfreeze(): Observable<Wallet> {
    return this.http.post<Wallet>(`${this.base}/unfreeze`, {});
  }
}
