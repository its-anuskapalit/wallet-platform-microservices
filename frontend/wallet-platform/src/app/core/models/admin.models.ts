export interface AdminDashboard {
  totalFraudFlags: number;
  unresolvedFraudFlags: number;
}

export interface FraudFlag {
  id: string;
  transactionId: string;
  flaggedByAdminId: string;
  reason: string;
  isResolved: boolean;
  createdAt: string;
}

export interface FraudFlagRequest {
  reason: string;
}
