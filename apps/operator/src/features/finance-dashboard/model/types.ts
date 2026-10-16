// 月ごとの収支（収入・支出・収支）。
export type MonthlyFinance = {
  month: string; // YYYY-MM
  incomeYen: number;
  expenseYen: number;
  balanceYen: number;
};

// 導入企業ごとの月間収入（月額基本料 + 従業員数 × ID料金）。
export type CompanyIncomeRow = {
  companyId: string;
  companyName: string;
  status: string;
  month: string;
  activeEmployees: number;
  monthlyBaseFee: number;
  perEmployeeMonthlyFee: number;
  monthlyIncomeYen: number;
  snapshotCapturedAt?: string;
};

// 支出の内訳に出す、完了した交換 1 件分。
export type MerchantExpenseExchange = {
  exchangeId: string;
  completedAt: string; // 売上を計上した日時（＝完了日時）
  merchandiseName: string;
  usedPoint: number;
  amountYen: number; // 交換相当額（使用ポイント × 5円）
  applicantName?: string;
  companyName?: string;
};

// 提携企業のある月の精算。手数料は提携企業側の請求と同じく、月の売上合計に対して計算する。
export type MerchantMonthlySettlement = {
  salesYen: number; // 売上（交換相当額の合計）
  exchangeFeeYen: number; // 交換手数料（運用者の収入）
  payableYen: number; // 支払額 ＝ 売上 − 交換手数料（運用者の支出）
  exchanges: MerchantExpenseExchange[];
};

// 提携企業ごと・月ごとの支出（提携企業への支払額）。
export type MerchantExpenseRow = {
  merchantId: string;
  merchantName: string;
  // 適用される交換手数料率（%、既定値解決済み）。
  exchangeFeePercent: number;
  // 表示対象の月のうち、完了した交換がある月だけ持つ。
  byMonth: Record<string, MerchantMonthlySettlement>;
  // 全期間の支払額の累計（表示対象外の月も含む）。
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
