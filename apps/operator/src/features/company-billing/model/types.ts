import type { CompanyBillingRowWithPointReturn } from "@correcre/lib/company-point-return";
import type { Company } from "@correcre/types";

// 導入企業ごとの請求履歴（rows は当月が先頭）。
export type CompanyBillingListItem = {
  companyId: string;
  companyName: string;
  status: Company["status"];
  plan: Company["plan"];
  pointUnitLabel: string;
  // 各月の会社ポイントへの還元を添えた請求履歴。
  rows: CompanyBillingRowWithPointReturn[];
};

export type CompanyBillingListData = {
  currentMonth: string; // YYYY-MM
  months: string[]; // 選択できる請求対象月（新しい順）
  companies: CompanyBillingListItem[];
};
