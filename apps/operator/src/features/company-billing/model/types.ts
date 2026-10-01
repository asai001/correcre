import type { CompanyBillingRow } from "@correcre/lib/company-billing";
import type { Company } from "@correcre/types";

// 導入企業ごとの請求履歴（rows は当月が先頭）。
export type CompanyBillingListItem = {
  companyId: string;
  companyName: string;
  status: Company["status"];
  plan: Company["plan"];
  rows: CompanyBillingRow[];
};

export type CompanyBillingListData = {
  currentMonth: string; // YYYY-MM
  months: string[]; // 選択できる請求対象月（新しい順）
  companies: CompanyBillingListItem[];
};
