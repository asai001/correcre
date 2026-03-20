export type EmployeeManagementRole = "EMPLOYEE" | "MANAGER" | "ADMIN";

export type EmployeeManagementEmployee = {
  userId: string;
  name: string;
  department: string;
  roles: EmployeeManagementRole[];
  email: string;
  phone: string;
  address: string;
  pointBalance: number;
  completionRate: number;
  joinedAt?: string;
  lastLoginAt?: string;
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
  employees: EmployeeManagementEmployee[];
};
