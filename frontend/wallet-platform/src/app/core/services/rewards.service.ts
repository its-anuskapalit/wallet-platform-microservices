import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RewardsAccount, PointsHistory, CatalogItem, Redemption, RedemptionRequest } from '../models/rewards.models';

@Injectable({ providedIn: 'root' })
export class RewardsService {
  private readonly rewardsBase = `${environment.apiGatewayUrl}/rewards`;
  private readonly catalogBase = `${environment.apiGatewayUrl}/catalog`;
  private readonly redemptionsBase = `${environment.apiGatewayUrl}/redemptions`;

  constructor(private http: HttpClient) {}

  getRewards(): Observable<RewardsAccount> {
    return this.http.get<RewardsAccount>(this.rewardsBase);
  }

  getHistory(): Observable<PointsHistory[]> {
    return this.http.get<PointsHistory[]>(`${this.rewardsBase}/history`);
  }

  getCatalog(): Observable<CatalogItem[]> {
    return this.http.get<CatalogItem[]>(this.catalogBase);
  }

  redeem(dto: RedemptionRequest): Observable<Redemption> {
    return this.http.post<Redemption>(this.redemptionsBase, dto);
  }

  getMyRedemptions(): Observable<Redemption[]> {
    return this.http.get<Redemption[]>(`${this.redemptionsBase}/my`);
  }

  getCatalogItemById(id: string): Observable<CatalogItem> {
    return this.http.get<CatalogItem>(`${this.catalogBase}/${id}`);
  }
}
