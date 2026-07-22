export interface TradeImage {
  id: string;
  tradeId: string;
  url: string;
  thumbnailUrl: string | null;
  createdAt: string;
}

export interface Trade {
  id: string;
  userId: string;
  symbol: string;
  type: "LONG" | "SHORT";
  entryDate: string;
  exitDate: string | null;
  entryPrice: number;
  exitPrice: number | null;
  size: number;
  sl: number | null;
  tp: number | null;
  notes: string | null;
  mood: "neutral" | "happy" | "sad" | null;
  tags: string[];
  commission: number | null;
  createdAt: string;
  updatedAt: string;
  images: TradeImage[];
}

export interface TradeFormData {
  symbol: string;
  type: "LONG" | "SHORT";
  entryDate: string;
  exitDate: string;
  entryPrice: string;
  exitPrice: string;
  size: string;
  sl: string;
  tp: string;
  notes: string;
  mood: "neutral" | "happy" | "sad";
  tags: string[];
  commission: string;
}

export interface DashboardStats {
  totalTrades: number;
  winRate: number;
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  avgRR: number;
  bestTrade: number;
  worstTrade: number;
  recentTrades: Trade[];
  equityCurve: { date: string; equity: number }[];
  plDistribution: { range: string; count: number }[];
}
