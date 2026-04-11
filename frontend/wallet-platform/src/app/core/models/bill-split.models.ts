export interface BillSplitParticipant {
  id: string;
  email: string;
  fullName: string;
  shareAmount: number;
  status: 'Pending' | 'Paid';
  paidAt: string | null;
}

export interface BillSplit {
  id: string;
  title: string;
  totalAmount: number;
  status: 'Open' | 'PartiallyPaid' | 'Completed' | 'Cancelled';
  creatorEmail: string;
  createdAt: string;
  participants: BillSplitParticipant[];
}

export interface CreateBillSplitRequest {
  title: string;
  totalAmount: number;
  participants: { email: string; shareAmount: number }[];
}
