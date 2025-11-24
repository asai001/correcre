type CompanyItemStatus = "ACTIVE" | "INACTIVE" | "TRIAL";
type CompanyPlan = "TRIAL" | "STANDARD" | "ENTERPRISE";

export type Company = {
  companyId: string;
  name: string;
  shortName?: string;
  kanaName?: string;

  // 契約・状態
  status: CompanyItemStatus;
  plan: CompanyPlan;
  trialEndsAt?: string; // ISO or YYYY-MM-DD
  contractStartsAt?: string;
  contractEndsAt?: string;
  perEmployeeMonthlyFee: number; // 従業員ひとりあたりの月額料金（税抜 or 税込、どちらかに統一）

  // コンタクト(お問い合わせ)
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  billingEmail?: string;

  // ポイント関連（企業保有ポイント）
  companyPointBalance: number; // 企業保有ポイント現在残高

  // 従業員数（集計キャッシュ）
  totalEmployees?: number; // 全従業員数
  activeEmployees: number; // 現在アクティブな従業員数

  // 設定・表示
  pointExpirationMonths?: number; // nヶ月後に失効 等
  pointUnitLabel?: string; // "ポイント", "pt" など
  timezone?: string; // "Asia/Tokyo"
  locale?: string; // "ja-JP"
  logoImageUrl?: string;
  primaryColor?: string;
  allowedEmailDomains?: string[];

  createdAt: string;
  updatedAt: string;
};
