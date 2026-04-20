import type { DBUserRole, Company, Department, Mission } from "@correcre/types";
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

export type AdminInfoData = {
  company: Company;
  editableCompany: CompanySummary;
  departments: AdminInfoDepartmentItem[];
  missions: Mission[];
  account: AdminInfoAccountSummary;
};

export type UpdateAdminCompanyInfoInput = UpdateCompanyInput & {
  shortName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  billingEmail?: string;
  logoImageUrl?: string;
  primaryColor?: string;
  pointConversionRate?: number | null;
};
