import data from "../../../../../mock/dynamodb.json";
import type { Company } from "@correcre/types";
import type {
  EmployeeManagementEmployee,
  EmployeeManagementRole,
  EmployeeManagementSummary,
} from "../model/types";

type RawMockUser = {
  companyId: string;
  userId: string;
  name: string;
  department?: string;
  joinedAt?: string;
  lastLoginAt?: string;
  currentPointBalance?: number;
  currentMonthCompletionRate?: number;
  roles?: EmployeeManagementRole[];
  status?: "ACTIVE" | "INACTIVE" | "DELETED";
};

const mockAddresses = [
  "東京都渋谷区神南 1-4-8",
  "東京都新宿区西新宿 3-2-11",
  "東京都品川区大崎 2-9-5",
  "東京都港区芝浦 4-7-16",
  "東京都中野区中央 5-12-3",
  "東京都千代田区神田錦町 2-5-4",
  "東京都目黒区青葉台 1-22-7",
  "東京都豊島区東池袋 3-10-6",
  "東京都江東区豊洲 5-3-9",
  "東京都台東区上野 6-14-2",
];

function buildFallbackEmail(userId: string) {
  return `${userId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}@correcre.jp`;
}

function buildFallbackPhone(index: number) {
  const middle = String(1000 + index * 37).padStart(4, "0");
  const last = String(2000 + index * 53).slice(-4);

  return `090-${middle}-${last}`;
}

function buildFallbackAddress(index: number) {
  return mockAddresses[index % mockAddresses.length];
}

function normalizeRoles(roles?: EmployeeManagementRole[]) {
  if (!roles?.length) {
    return ["EMPLOYEE"] satisfies EmployeeManagementRole[];
  }

  return roles;
}

function toEmployee(user: RawMockUser, index: number): EmployeeManagementEmployee {
  return {
    userId: user.userId,
    name: user.name,
    department: user.department ?? "未所属",
    roles: normalizeRoles(user.roles),
    email: buildFallbackEmail(user.userId),
    phone: buildFallbackPhone(index + 1),
    address: buildFallbackAddress(index),
    pointBalance: user.currentPointBalance ?? 0,
    completionRate: user.currentMonthCompletionRate ?? 0,
    joinedAt: user.joinedAt,
    lastLoginAt: user.lastLoginAt,
  };
}

function getAdminName(users: RawMockUser[], adminUserId?: string) {
  const selectedAdmin =
    users.find((user) => user.userId === adminUserId && normalizeRoles(user.roles).includes("ADMIN")) ??
    users.find((user) => normalizeRoles(user.roles).includes("ADMIN")) ??
    users[0];

  return selectedAdmin?.name ?? "システム管理者";
}

export async function getEmployeeManagementSummaryFromDynamoMock(
  companyId: string,
  adminUserId?: string
): Promise<EmployeeManagementSummary> {
  const companies = data.Company as Company[];
  const users = data.User as RawMockUser[];

  const company = companies.find((item) => item.companyId === companyId);
  if (!company) {
    throw new Error("Company not found");
  }

  const companyUsers = users
    .filter((item) => item.companyId === companyId && item.status !== "DELETED")
    .map((item, index) => toEmployee(item, index));

  const totalEmployeePoints = companyUsers.reduce((sum, employee) => sum + employee.pointBalance, 0);
  const totalCompletionRate = companyUsers.reduce((sum, employee) => sum + employee.completionRate, 0);
  const departments = new Set(companyUsers.map((employee) => employee.department));

  return {
    companyId,
    companyName: company.shortName || company.name,
    adminName: getAdminName(users.filter((item) => item.companyId === companyId), adminUserId),
    updatedAt: company.updatedAt,
    employeeCount: company.totalEmployees ?? companyUsers.length,
    departmentCount: departments.size,
    totalEmployeePoints,
    companyPointBalance: company.companyPointBalance,
    averageCompletionRate: companyUsers.length ? Math.round(totalCompletionRate / companyUsers.length) : 0,
    pointUnitLabel: company.pointUnitLabel ?? "pt",
    employees: companyUsers,
  };
}
