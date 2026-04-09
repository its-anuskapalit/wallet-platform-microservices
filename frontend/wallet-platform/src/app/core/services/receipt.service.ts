import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReceiptService {
  private readonly base = `${environment.apiGatewayUrl}/receipts`;

  constructor(private http: HttpClient) {}

  downloadPdf(transactionId: string): Observable<Blob> {
    return this.http.get(`${this.base}/transaction/${transactionId}/pdf`, {
      responseType: 'blob'
    });
  }
}
