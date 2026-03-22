export type EmployeeManagementRole = "EMPLOYEE" | "MANAGER" | "ADMIN";

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

export type EmployeeManagementEmployee = {
  userId: string;
  name: string;
  departments: string[];
  roles: EmployeeManagementRole[];
  email: string;
  phone: string;
  address: string;
  pointBalance: number;
  completionRate: number;
  joinedAt?: string;
  lastLoginAt?: string;
};

export type CreateEmployeeInput = {
  name: string;
  departments: string[];
  email: string;
  phone: string;
  address: string;
  role: EmployeeManagementRole;
  joinedAt: string;
};

export type UpdateEmployeeInput = {
  userId: string;
  name: string;
  departments: string[];
  email: string;
  phone: string;
  address: string;
  role: EmployeeManagementRole;
  joinedAt: string;
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
