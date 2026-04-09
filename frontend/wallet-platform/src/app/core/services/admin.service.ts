import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminDashboard, FraudFlag, FraudFlagRequest } from '../models/admin.models';
import { UserProfile, PagedResult } from '../models/profile.models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly base    = `${environment.apiGatewayUrl}/admin`;
  private readonly profile = `${environment.apiGatewayUrl}/profile`;
  private readonly wallet  = `${environment.apiGatewayUrl}/wallet`;

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<AdminDashboard> {
    return this.http.get<AdminDashboard>(`${this.base}/dashboard`);
  }

  getFraudFlags(): Observable<FraudFlag[]> {
    return this.http.get<FraudFlag[]>(`${this.base}/transactions/fraud-flags`);
  }

  flagTransaction(transactionId: string, dto: FraudFlagRequest): Observable<FraudFlag> {
    return this.http.post<FraudFlag>(`${this.base}/transactions/${transactionId}/flag`, dto);
  }

  getAllUsers(page = 1, pageSize = 20): Observable<PagedResult<UserProfile>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PagedResult<UserProfile>>(`${this.profile}/admin/all`, { params });
  }

  freezeWallet(userId: string, reason: string): Observable<unknown> {
    return this.http.post(`${this.wallet}/admin/freeze/${userId}`, { reason });
  }

  unfreezeWallet(userId: string): Observable<unknown> {
    return this.http.post(`${this.wallet}/admin/unfreeze/${userId}`, {});
  }
}
