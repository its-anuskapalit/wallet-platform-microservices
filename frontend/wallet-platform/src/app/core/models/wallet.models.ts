export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  isFrozen: boolean;
  frozenReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TopUpRequest {
  amount: number;
  idempotencyKey: string;
}

export interface DeductRequest {
  amount: number;
  idempotencyKey: string;
}

export interface FreezeRequest {
  reason: string;
}
