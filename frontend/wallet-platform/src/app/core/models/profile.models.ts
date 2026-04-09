export type KycStatus = 'NotSubmitted' | 'Pending' | 'Approved' | 'Rejected';

export interface UserProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  kycStatus: KycStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
}

export interface KycSubmitRequest {
  documentType: string;
  documentNumber: string;
}

export interface KycReviewRequest {
  approve: boolean;
  rejectionReason?: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
