import data from "../../../../../mock/dynamodb.json";
import type { Company } from "@correcre/types";
import type {
  CreateDepartmentInput,
  CreateEmployeeInput,
  DeleteEmployeeInput,
  EmployeeDepartmentOption,
  EmployeeManagementEmployee,
  EmployeeManagementRole,
  EmployeeManagementSummary,
  RenameDepartmentInput,
  UpdateEmployeeInput,
} from "../model/types";

type RawMockUser = {
  companyId: string;
  userId: string;
  name: string;
  department?: string;
  departments?: string[];
  email?: string;
  phone?: string;
  address?: string;
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

const companyStore: Company[] = (data.Company as Company[]).map((company) => ({ ...company }));
const userStore: RawMockUser[] = (data.User as RawMockUser[]).map((user) => ({
  ...user,
  departments: normalizeDepartmentNames(user.departments ?? (user.department ? [user.department] : [])),
  roles: user.roles ? [...user.roles] : undefined,
}));
const departmentStore = new Map<string, string[]>();

for (const company of companyStore) {
  departmentStore.set(company.companyId, []);
}

for (const user of userStore) {
  for (const department of normalizeDepartmentNames(user.departments)) {
    addDepartmentName(user.companyId, department);
  }
}

function normalizeDepartmentNames(departments?: string[]) {
  return Array.from(
    new Set(
      (departments ?? [])
        .map((department) => department.trim())
        .filter(Boolean)
    )
  );
}

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

function addDepartmentName(companyId: string, name: string) {
  const normalizedName = name.trim();
  if (!normalizedName) {
    return;
  }

  const departmentNames = departmentStore.get(companyId) ?? [];
  if (!departmentNames.includes(normalizedName)) {
    departmentNames.push(normalizedName);
    departmentNames.sort((left, right) => left.localeCompare(right, "ja"));
  }

  departmentStore.set(companyId, departmentNames);
}

function getCompany(companyId: string) {
  return companyStore.find((item) => item.companyId === companyId) ?? null;
}

function getCompanyUsers(companyId: string) {
  return userStore.filter((item) => item.companyId === companyId && item.status !== "DELETED");
}

function findCompanyUser(companyId: string, userId: string) {
  return getCompanyUsers(companyId).find((item) => item.userId === userId) ?? null;
}

function getCompanyDepartments(companyId: string) {
  if (!departmentStore.has(companyId)) {
    departmentStore.set(companyId, []);
  }

  return departmentStore.get(companyId)!;
}

function getDepartmentOptions(companyId: string): EmployeeDepartmentOption[] {
  const users = getCompanyUsers(companyId);

  return getCompanyDepartments(companyId).map((departmentName) => ({
    name: departmentName,
    employeeCount: users.filter((user) => normalizeDepartmentNames(user.departments).includes(departmentName)).length,
  }));
}

function toEmployee(user: RawMockUser, index: number): EmployeeManagementEmployee {
  return {
    userId: user.userId,
    name: user.name,
    departments: normalizeDepartmentNames(user.departments ?? (user.department ? [user.department] : [])),
    roles: normalizeRoles(user.roles),
    email: user.email ?? buildFallbackEmail(user.userId),
    phone: user.phone ?? buildFallbackPhone(index + 1),
    address: user.address ?? buildFallbackAddress(index),
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

function getNextUserId(users: RawMockUser[]) {
  const nextNumber =
    users.reduce((max, user) => {
      const match = /^u-(\d+)$/.exec(user.userId);
      if (!match) {
        return max;
      }

      return Math.max(max, Number(match[1]));
    }, 0) + 1;

  return `u-${String(nextNumber).padStart(3, "0")}`;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateCreateEmployeeInput(companyId: string, input: CreateEmployeeInput) {
  const name = input.name.trim();
  const departments = normalizeDepartmentNames(input.departments);
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  const address = input.address.trim();
  const joinedAt = input.joinedAt.trim();
  const availableDepartments = getCompanyDepartments(companyId);

  if (!name || !departments.length || !email || !phone || !address || !joinedAt) {
    throw new Error("必須項目を入力してください");
  }

  if (!departments.every((department) => availableDepartments.includes(department))) {
    throw new Error("存在しない部署が選択されています");
  }

  if (!isValidEmail(email)) {
    throw new Error("メールアドレスの形式が正しくありません");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(joinedAt)) {
    throw new Error("入社日は YYYY-MM-DD 形式で入力してください");
  }

  const emailExists = getCompanyUsers(companyId).some(
    (user) => (user.email ?? buildFallbackEmail(user.userId)).toLowerCase() === email
  );

  if (emailExists) {
    throw new Error("同じメールアドレスの従業員が既に存在します");
  }
}

function validateUpdateEmployeeInput(companyId: string, employee: RawMockUser, input: UpdateEmployeeInput) {
  const name = input.name.trim();
  const departments = normalizeDepartmentNames(input.departments);
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  const address = input.address.trim();
  const joinedAt = input.joinedAt.trim();
  const pointAdjustment = input.pointAdjustment;
  const availableDepartments = getCompanyDepartments(companyId);
  const currentPointBalance = employee.currentPointBalance ?? 0;

  if (!name || !departments.length || !email || !phone || !address || !joinedAt) {
    throw new Error("必須項目を入力してください");
  }

  if (!departments.every((department) => availableDepartments.includes(department))) {
    throw new Error("存在しない部署が選択されています");
  }

  if (!isValidEmail(email)) {
    throw new Error("メールアドレスの形式が正しくありません");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(joinedAt)) {
    throw new Error("入社日は YYYY-MM-DD 形式で入力してください");
  }

  if (!Number.isInteger(pointAdjustment)) {
    throw new Error("ポイント増減は整数で入力してください");
  }

  if (currentPointBalance + pointAdjustment < 0) {
    throw new Error("調整後の保有ポイントが 0 未満になるため更新できません");
  }

  const emailExists = getCompanyUsers(companyId).some(
    (user) =>
      user.userId !== employee.userId && (user.email ?? buildFallbackEmail(user.userId)).toLowerCase() === email
  );

  if (emailExists) {
    throw new Error("同じメールアドレスの従業員が既に存在します");
  }
}

function touchCompany(companyId: string) {
  const company = getCompany(companyId);
  if (!company) {
    throw new Error("Company not found");
  }

  company.totalEmployees = getCompanyUsers(companyId).length;
  company.activeEmployees = getCompanyUsers(companyId).length;
  company.updatedAt = new Date().toISOString();
}

export async function getEmployeeManagementSummaryFromDynamoMock(
  companyId: string,
  adminUserId?: string
): Promise<EmployeeManagementSummary> {
  const company = getCompany(companyId);
  if (!company) {
    throw new Error("Company not found");
  }

  const companyUsers = getCompanyUsers(companyId).map((item, index) => toEmployee(item, index));
  const totalEmployeePoints = companyUsers.reduce((sum, employee) => sum + employee.pointBalance, 0);
  const totalCompletionRate = companyUsers.reduce((sum, employee) => sum + employee.completionRate, 0);
  const departmentOptions = getDepartmentOptions(companyId);

  return {
    companyId,
    companyName: company.shortName || company.name,
    adminName: getAdminName(getCompanyUsers(companyId), adminUserId),
    updatedAt: company.updatedAt,
    employeeCount: companyUsers.length,
    departmentCount: departmentOptions.length,
    totalEmployeePoints,
    companyPointBalance: company.companyPointBalance,
    averageCompletionRate: companyUsers.length ? Math.round(totalCompletionRate / companyUsers.length) : 0,
    pointUnitLabel: company.pointUnitLabel ?? "pt",
    departmentOptions,
    employees: companyUsers,
  };
}

export async function createEmployeeInDynamoMock(
  companyId: string,
  input: CreateEmployeeInput
): Promise<EmployeeManagementEmployee> {
  const company = getCompany(companyId);
  if (!company) {
    throw new Error("Company not found");
  }

  validateCreateEmployeeInput(companyId, input);

  const createdUser: RawMockUser = {
    companyId,
    userId: getNextUserId(getCompanyUsers(companyId)),
    name: input.name.trim(),
    departments: normalizeDepartmentNames(input.departments),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    address: input.address.trim(),
    joinedAt: input.joinedAt.trim(),
    currentPointBalance: 0,
    currentMonthCompletionRate: 0,
    roles: [input.role],
    status: "ACTIVE",
  };

  userStore.unshift(createdUser);
  touchCompany(companyId);

  return toEmployee(createdUser, 0);
}

export async function updateEmployeeInDynamoMock(
  companyId: string,
  input: UpdateEmployeeInput
): Promise<EmployeeManagementEmployee> {
  const company = getCompany(companyId);
  if (!company) {
    throw new Error("Company not found");
  }

  const targetUser = findCompanyUser(companyId, input.userId);
  if (!targetUser) {
    throw new Error("Employee not found");
  }

  validateUpdateEmployeeInput(companyId, targetUser, input);

  const nextCompanyPointBalance = company.companyPointBalance - input.pointAdjustment;
  if (nextCompanyPointBalance < 0) {
    throw new Error("企業保有ポイントが不足しているため更新できません");
  }

  targetUser.name = input.name.trim();
  targetUser.departments = normalizeDepartmentNames(input.departments);
  targetUser.email = input.email.trim().toLowerCase();
  targetUser.phone = input.phone.trim();
  targetUser.address = input.address.trim();
  targetUser.joinedAt = input.joinedAt.trim();
  targetUser.roles = [input.role];
  targetUser.currentPointBalance = (targetUser.currentPointBalance ?? 0) + input.pointAdjustment;
  company.companyPointBalance = nextCompanyPointBalance;
  delete targetUser.department;

  touchCompany(companyId);

  return toEmployee(targetUser, 0);
}

export async function deleteEmployeeInDynamoMock(companyId: string, input: DeleteEmployeeInput): Promise<void> {
  const company = getCompany(companyId);
  if (!company) {
    throw new Error("Company not found");
  }

  const userId = input.userId.trim();
  if (!userId) {
    throw new Error("削除対象のユーザーIDが不正です");
  }

  const targetUser = findCompanyUser(companyId, userId);
  if (!targetUser) {
    throw new Error("Employee not found");
  }

  targetUser.status = "DELETED";
  touchCompany(companyId);
}

export async function createDepartmentInDynamoMock(companyId: string, input: CreateDepartmentInput): Promise<void> {
  const company = getCompany(companyId);
  if (!company) {
    throw new Error("Company not found");
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("部署名を入力してください");
  }

  const departments = getCompanyDepartments(companyId);
  if (departments.includes(name)) {
    throw new Error("同じ部署名が既に存在します");
  }

  addDepartmentName(companyId, name);
  touchCompany(companyId);
}

export async function renameDepartmentInDynamoMock(companyId: string, input: RenameDepartmentInput): Promise<void> {
  const company = getCompany(companyId);
  if (!company) {
    throw new Error("Company not found");
  }

  const currentName = input.currentName.trim();
  const nextName = input.nextName.trim();

  if (!currentName || !nextName) {
    throw new Error("部署名を入力してください");
  }

  const departments = getCompanyDepartments(companyId);
  if (!departments.includes(currentName)) {
    throw new Error("編集対象の部署が見つかりません");
  }

  if (currentName !== nextName && departments.includes(nextName)) {
    throw new Error("同じ部署名が既に存在します");
  }

  const updatedDepartments = departments.map((department) => (department === currentName ? nextName : department));
  departmentStore.set(
    companyId,
    Array.from(new Set(updatedDepartments)).sort((left, right) => left.localeCompare(right, "ja"))
  );

  for (const user of getCompanyUsers(companyId)) {
    user.departments = normalizeDepartmentNames(
      (user.departments ?? (user.department ? [user.department] : [])).map((department) =>
        department === currentName ? nextName : department
      )
    );
    delete user.department;
  }

  touchCompany(companyId);
}

export async function deleteDepartmentInDynamoMock(companyId: string, departmentName: string): Promise<void> {
  const company = getCompany(companyId);
  if (!company) {
    throw new Error("Company not found");
  }

  const normalizedName = departmentName.trim();
  if (!normalizedName) {
    throw new Error("削除対象の部署が不正です");
  }

  const departments = getCompanyDepartments(companyId);
  if (!departments.includes(normalizedName)) {
    throw new Error("削除対象の部署が見つかりません");
  }

  const employeeUsingDepartment = getCompanyUsers(companyId).some((user) =>
    normalizeDepartmentNames(user.departments ?? (user.department ? [user.department] : [])).includes(normalizedName)
  );

  if (employeeUsingDepartment) {
    throw new Error("所属中の従業員がいるため削除できません");
  }

  departmentStore.set(
    companyId,
    departments.filter((department) => department !== normalizedName)
  );

  touchCompany(companyId);
}
