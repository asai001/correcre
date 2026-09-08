import type { AnalysisThresholds, Company } from "@correcre/types";

export type CompanyStatus = Company["status"];
export type CompanyPlan = Company["plan"];

export type CompanyPhilosophyItem = {
  id: string;
  label: string;
  content: string;
  displayOnDashboard: boolean;
};

export type CompanySummary = {
  companyId: string;
  companyName: string;
  legalName: string;
  shortName?: string;
  status: CompanyStatus;
  plan: CompanyPlan;
  employeeCount: number;
  activeEmployeeCount: number;
  companyPointBalance: number;
  perEmployeeMonthlyFee: number;
  pointUnitLabel: string;
  showPointExchangeLink: boolean;
  philosophyItems: CompanyPhilosophyItem[];
  // 項目分析の閾値の企業既定値。未設定（システム既定値に従う）の場合は null。
  analysisThresholds: AnalysisThresholds | null;
  updatedAt: string;
};

export type CreateCompanyInput = {
  name: string;
  status: CompanyStatus;
  plan: CompanyPlan;
  perEmployeeMonthlyFee: number;
  companyPointBalance: number;
  pointUnitLabel?: string;
  showPointExchangeLink?: boolean;
  philosophyItems: CompanyPhilosophyItem[];
};

// 更新は部分更新を許容する。未指定のフィールドは既存値を維持する
// （各画面が自分の管理外フィールドを古いスナップショットで巻き戻さないため）。
export type UpdateCompanyInput = Partial<Omit<CreateCompanyInput, "showPointExchangeLink">> & {
  companyId: string;
  showPointExchangeLink?: boolean;
  pointAdjustment?: number;
  // 項目分析の閾値の企業既定値。undefined = 変更しない / null = 未設定に戻す（システム既定値に従う）。
  analysisThresholds?: AnalysisThresholds | null;
};

export type OperatorCompanyStatus = CompanyStatus;
export type OperatorCompanyPlan = CompanyPlan;
export type OperatorCompanyPhilosophyItem = CompanyPhilosophyItem;
export type OperatorCompanySummary = CompanySummary;
