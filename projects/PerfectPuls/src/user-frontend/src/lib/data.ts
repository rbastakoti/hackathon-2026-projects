export type Category = {
  name: string;
  type: string;
  sessionsUsed: number;
  sessionsTotal: number;
  allowanceUsed: number;
  allowanceTotal: number;
  saved: number;
};

export type Activity = {
  date: string;
  provider: string;
  service: string;
  saved: number;
};

export type DashboardDataset = {
  totalSaved: number;
  outOfPocketAvoided: number;
  categories: Category[];
  recentActivity: Activity[];
};

export type DashboardDataResponse = {
  status: "success" | "error" | "no_policies";
  message: string;
  policyId?: string;
  processedAt?: string | null;
  availableMonths: string[];
  monthlyData: Record<string, DashboardDataset>;
  yearData: DashboardDataset;
};

export const EMPTY_DATASET: DashboardDataset = {
  totalSaved: 0,
  outOfPocketAvoided: 0,
  categories: [],
  recentActivity: [],
};
