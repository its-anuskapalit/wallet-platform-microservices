import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Transaction, InitiateTransactionRequest, TransactionSummary } from '../models/transaction.models';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly base = `${environment.apiGatewayUrl}/transactions`;

  constructor(private http: HttpClient) {}

  initiate(dto: InitiateTransactionRequest): Observable<Transaction> {
    return this.http.post<Transaction>(this.base, dto);
  }

  getById(transactionId: string): Observable<Transaction> {
    return this.http.get<Transaction>(`${this.base}/${transactionId}`);
  }

  getMyTransactions(page = 1, pageSize = 20): Observable<Transaction[]> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<Transaction[]>(`${this.base}/my`, { params });
  }

  getSummary(): Observable<TransactionSummary> {
    return this.http.get<TransactionSummary>(`${this.base}/summary`);
  }
}
