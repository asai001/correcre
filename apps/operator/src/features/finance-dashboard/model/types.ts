// 月ごとの収支（収入・支出・収支）。
export type MonthlyFinance = {
  month: string; // YYYY-MM
  incomeYen: number;
  expenseYen: number;
  balanceYen: number;
};

// 導入企業ごとの月間収入（従業員数 × 月額単価）。
export type CompanyIncomeRow = {
  companyId: string;
  companyName: string;
  status: string;
  month: string;
  activeEmployees: number;
  perEmployeeMonthlyFee: number;
  monthlyIncomeYen: number;
  snapshotCapturedAt?: string;
};

// 提携企業ごと・月ごとの支出（交換ポイント × 5円）。
export type MerchantExpenseRow = {
  merchantId: string;
  merchantName: string;
  // 適用される交換手数料率（%、既定値解決済み）。
  exchangeFeePercent: number;
  byMonth: Record<string, number>;
  totalExpenseYen: number;
};

export type FinanceDashboardData = {
  months: string[]; // 表示対象の月（昇順）
  monthly: MonthlyFinance[];
  companies: CompanyIncomeRow[];
  companyIncomeByMonth: Record<string, CompanyIncomeRow[]>;
  monthlyIncomeByMonth: Record<string, number>;
  merchants: MerchantExpenseRow[];
  // 1か月あたりの収入合計（現在の従業員数・単価のスナップショット）。
  monthlyIncomeYen: number;
};
