import type { Company } from "@correcre/types";

export type OperatorCompanyStatus = Company["status"];
export type OperatorCompanyPlan = Company["plan"];

export type OperatorCompanyPhilosophyItem = {
  id: string;
  label: string;
  content: string;
  displayOnDashboard: boolean;
};

export type OperatorCompanySummary = {
  companyId: string;
  companyName: string;
  legalName: string;
  shortName?: string;
  status: OperatorCompanyStatus;
  plan: OperatorCompanyPlan;
  employeeCount: number;
  activeEmployeeCount: number;
  companyPointBalance: number;
  perEmployeeMonthlyFee: number;
  pointUnitLabel: string;
  philosophyItems: OperatorCompanyPhilosophyItem[];
  updatedAt: string;
};

export type CreateCompanyInput = {
  name: string;
  status: OperatorCompanyStatus;
  plan: OperatorCompanyPlan;
  perEmployeeMonthlyFee: number;
  companyPointBalance: number;
  pointUnitLabel?: string;
  philosophyItems: OperatorCompanyPhilosophyItem[];
};

export type UpdateCompanyInput = CreateCompanyInput & {
  companyId: string;
};
