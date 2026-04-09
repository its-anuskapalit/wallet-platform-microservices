export type TransactionStatus = 'Pending' | 'Completed' | 'Failed';
export type TransactionType = 'Transfer' | 'TopUp' | 'Deduction';

export interface Transaction {
  id: string;
  senderWalletId: string;
  receiverWalletId: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  type: TransactionType;
  reference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionSummary {
  totalSent: number;
  totalReceived: number;
  thisMonthSent: number;
  thisMonthReceived: number;
  totalTransactionCount: number;
  thisMonthTransactionCount: number;
}

export interface InitiateTransactionRequest {
  senderWalletId: string;
  receiverWalletId: string;
  receiverUserId: string;
  amount: number;
  currency?: string;
  type?: string;
  idempotencyKey?: string;
}
