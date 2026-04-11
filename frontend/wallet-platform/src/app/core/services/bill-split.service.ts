import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BillSplit, CreateBillSplitRequest } from '../models/bill-split.models';

@Injectable({ providedIn: 'root' })
export class BillSplitService {
  private http = inject(HttpClient);
  private base = `${environment.apiGatewayUrl}/wallet/billsplit`;

  create(dto: CreateBillSplitRequest): Observable<BillSplit> {
    return this.http.post<BillSplit>(this.base, dto);
  }

  getCreated(): Observable<BillSplit[]> {
    return this.http.get<BillSplit[]>(`${this.base}/created`);
  }

  getOwed(): Observable<BillSplit[]> {
    return this.http.get<BillSplit[]>(`${this.base}/owed`);
  }

  payShare(splitId: string): Observable<BillSplit> {
    return this.http.post<BillSplit>(`${this.base}/${splitId}/pay`, {});
  }
}
