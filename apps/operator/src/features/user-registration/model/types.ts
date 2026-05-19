export type EmployeeManagementRole = "EMPLOYEE" | "MANAGER" | "ADMIN" | "OPERATOR";
export type EmployeeAssignableRole = "EMPLOYEE" | "ADMIN" | "OPERATOR";
export type EmployeeManagementStatus = "INVITED" | "ACTIVE" | "INACTIVE";
export type EmployeeAuthLinkStatus = "UNLINKED" | "LINKED";

export type MutationResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

export type EmployeeDepartmentOption = {
  name: string;
  employeeCount: number;
};

export type EmployeeAddress = {
  postalCode?: string;
  prefecture?: string;
  city?: string;
  building?: string;
};

export type EmployeeManagementEmployee = {
  userId: string;
  name: string;
  nameKana?: string;
  lastName: string;
  firstName: string;
  lastNameKana: string;
  firstNameKana: string;
  departmentName?: string;
  roles: EmployeeManagementRole[];
  status: EmployeeManagementStatus;
  authLinkStatus: EmployeeAuthLinkStatus;
  email: string;
  phoneNumber?: string;
  address?: EmployeeAddress;
  pointBalance: number;
  completionRate: number;
  joinedAt?: string;
  lastLoginAt?: string;
};

type EmployeeFormFields = {
  lastName: string;
  firstName: string;
  lastNameKana: string;
  firstNameKana: string;
  departmentName: string;
  email: string;
  phoneNumber?: string;
  postalCodeFirstHalf?: string;
  postalCodeSecondHalf?: string;
  prefecture?: string;
  city?: string;
  building?: string;
  roles: EmployeeAssignableRole[];
  joinedAt: string;
};

export type CreateEmployeeInput = EmployeeFormFields;

export type UpdateEmployeeInput = EmployeeFormFields & {
  userId: string;
  status: EmployeeManagementStatus;
  pointAdjustment: number;
};

export type DeleteEmployeeInput = {
  userId: string;
};

export type CreateDepartmentInput = {
  name: string;
};

export type RenameDepartmentInput = {
  currentName: string;
  nextName: string;
};

export type EmployeeManagementSummary = {
  companyId: string;
  companyName: string;
  adminName: string;
  updatedAt: string;
  employeeCount: number;
  departmentCount: number;
  totalEmployeePoints: number;
  companyPointBalance: number;
  averageCompletionRate: number;
  pointUnitLabel: string;
  departmentOptions: EmployeeDepartmentOption[];
  employees: EmployeeManagementEmployee[];
};
