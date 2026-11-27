export type TimeframeType = 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';

export interface CategorySpendItem {
  id: string;
  name: string;
  color: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface TopReasonItem {
  description: string;
  amount: number;
  count: number;
}

export interface MemberSpendItem {
  user_id: string;
  name: string;
  email: string;
  amount: number;
  percentage: number;
}

export interface TimeSeriesItem {
  dateLabel: string;
  income: number;
  expense: number;
  net: number;
}

export interface ReportSummary {
  timeframe: TimeframeType;
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number; // percentage
  transfersCount: number;
  transfersTotalAmount: number;
  timeSeries: TimeSeriesItem[];
  topCategories: CategorySpendItem[];
  topReasons: TopReasonItem[];
  memberSpend: MemberSpendItem[];
}
