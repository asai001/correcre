import type { Company } from "@correcre/types";

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

export type UpdateCompanyInput = CreateCompanyInput & {
  companyId: string;
};

export type OperatorCompanyStatus = CompanyStatus;
export type OperatorCompanyPlan = CompanyPlan;
export type OperatorCompanyPhilosophyItem = CompanyPhilosophyItem;
export type OperatorCompanySummary = CompanySummary;
