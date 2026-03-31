import type { Company } from "@correcre/types";

export type OperatorCompanyStatus = Company["status"];
export type OperatorCompanyPlan = Company["plan"];

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
  updatedAt: string;
};

export type CreateCompanyInput = {
  companyId: string;
  name: string;
  shortName?: string;
  status: OperatorCompanyStatus;
  plan: OperatorCompanyPlan;
  perEmployeeMonthlyFee: number;
  companyPointBalance: number;
  pointUnitLabel?: string;
};
