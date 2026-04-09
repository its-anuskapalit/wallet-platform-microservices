export interface RewardsAccount {
  id: string;
  userId: string;
  totalPoints: number;
  redeemedPoints: number;
  availablePoints: number;
  tier: string;
  createdAt: string;
}

export interface PointsHistory {
  transactionId: string;
  points: number;
  description: string;
  createdAt: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  pointsRequired: number;
  category: string;
  isActive: boolean;
  stock: number;
}

export interface RedemptionRequest {
  catalogItemId: string;
}

export interface Redemption {
  id: string;
  userId: string;
  catalogItemId: string;
  itemName: string;
  category: string;
  pointsUsed: number;
  status: string;
  voucherCode?: string;
  createdAt: string;
}
