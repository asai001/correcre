export type DepartmentStatus = "ACTIVE" | "INACTIVE";

export type Department = {
  companyId: string;
  sk: `DEPT#${string}`;
  departmentId: string;
  name: string;
  status: DepartmentStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};
