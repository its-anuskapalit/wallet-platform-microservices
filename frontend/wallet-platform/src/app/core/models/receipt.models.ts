export interface Receipt {
  id: string;
  transactionId: string;
  userId: string;
  amount: number;
  currency: string;
  generatedAt: string;
  downloadUrl?: string;
}
