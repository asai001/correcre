import type { DBUserRole, Company, Department, Mission } from "@correcre/types";
import type { CompanyBillingRow } from "@correcre/lib/company-billing";
import type { CompanyInvoice, InvoiceIssuer } from "@correcre/lib/company-invoice";
import type { CompanySummary, UpdateCompanyInput } from "@correcre/lib/company-management-types";

export type AdminInfoDepartmentItem = Pick<Department, "departmentId" | "name" | "status" | "sortOrder"> & {
  employeeCount: number;
  employees: Array<{
    userId: string;
    name: string;
    email: string;
  }>;
};

export type AdminInfoAccountSummary = {
  name: string;
  email: string;
  departmentName?: string;
  roles: DBUserRole[];
  joinedAt?: string;
  lastLoginAt?: string;
};

export type AdminInfoUserCounts = {
  registered: number;
  active: number;
  inactive: number;
};

export type AdminInfoData = {
  company: Company;
  editableCompany: CompanySummary;
  departments: AdminInfoDepartmentItem[];
  missions: Mission[];
  account: AdminInfoAccountSummary;
  userCounts: AdminInfoUserCounts;
  // 月額利用料の請求履歴（当月が先頭）。
  billingRows: CompanyBillingRow[];
};

// 管理者が更新できる項目のみ。契約・請求に関わる項目（会社名・ステータス・プラン・料金など）は含めない。
export type UpdateAdminCompanyInfoInput = Pick<UpdateCompanyInput, "philosophyItems"> & {
  shortName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  billingEmail?: string;
  logoImageUrl?: string;
  primaryColor?: string;
  pointConversionRate?: number | null;
  address?: string;
  representativeName?: string;
  representativePhone?: string;
  representativeEmail?: string;
};

// 請求書の出力用データ（運用者 → 導入企業の月額利用料）。
export type CompanyInvoiceData = {
  invoice: CompanyInvoice;
  issuer: InvoiceIssuer;
  recipient: {
    companyName: string;
    address?: string;
    contactName?: string;
  };
};
