import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserProfile, UpdateProfileRequest, KycSubmitRequest, KycReviewRequest } from '../models/profile.models';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly profileBase = `${environment.apiGatewayUrl}/profile`;
  private readonly kycBase = `${environment.apiGatewayUrl}/kyc`;

  constructor(private http: HttpClient) {}

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(this.profileBase);
  }

  updateProfile(dto: UpdateProfileRequest): Observable<UserProfile> {
    return this.http.put<UserProfile>(this.profileBase, dto);
  }

  submitKyc(dto: KycSubmitRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.kycBase}/submit`, dto);
  }

  reviewKyc(userProfileId: string, dto: KycReviewRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.kycBase}/review/${userProfileId}`, dto);
  }

  lookupByEmail(email: string): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.profileBase}/lookup`, { params: { email } });
  }
}
