import data from "../../../../../mock/dynamodb.json";
import type { Company } from "@correcre/types";
import type { CreateCompanyInput, OperatorCompanySummary } from "@operator/features/company-registration/model/types";
import type {
  CreateDepartmentInput,
  CreateEmployeeInput,
  DeleteEmployeeInput,
  EmployeeAuthLinkStatus,
  EmployeeDepartmentOption,
  EmployeeManagementEmployee,
  EmployeeManagementRole,
  EmployeeManagementStatus,
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
  loginId?: string;
  cognitoSub?: string;
  email?: string;
  phone?: string;
  address?: string;
  joinedAt?: string;
  lastLoginAt?: string;
  currentPointBalance?: number;
  currentMonthCompletionRate?: number;
  roles?: EmployeeManagementRole[];
  status?: EmployeeManagementStatus | "ACTIVE" | "INACTIVE" | "DELETED";
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
  loginId: normalizeLoginId(user.loginId, user.userId),
  cognitoSub: user.cognitoSub?.trim() || undefined,
  roles: user.roles ? [...user.roles] : undefined,
  status: normalizeUserStatus(user.status, user.lastLoginAt),
}));
const departmentStore = new Map<string, string[]>();

assertUniqueCognitoSubs();

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

function buildFallbackLoginId(userId: string) {
  return userId.replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase();
}

function buildFallbackPhone(index: number) {
  const middle = String(1000 + index * 37).padStart(4, "0");
  const last = String(2000 + index * 53).slice(-4);

  return `090-${middle}-${last}`;
}

function buildFallbackAddress(index: number) {
  return mockAddresses[index % mockAddresses.length];
}

function normalizeLoginId(loginId: string | undefined, userId: string) {
  const normalized = loginId?.trim().toLowerCase();
  return normalized || buildFallbackLoginId(userId);
}

function normalizeUserStatus(
  status: RawMockUser["status"],
  lastLoginAt?: string
): EmployeeManagementStatus | "DELETED" {
  if (status === "DELETED") {
    return "DELETED";
  }

  if (status === "INACTIVE" || status === "SUSPENDED") {
    return "SUSPENDED";
  }

  if (status === "INVITED") {
    return "INVITED";
  }

  if (status === "ACTIVE") {
    return "ACTIVE";
  }

  return lastLoginAt ? "ACTIVE" : "INVITED";
}

function getAuthLinkStatus(cognitoSub?: string): EmployeeAuthLinkStatus {
  return cognitoSub?.trim() ? "LINKED" : "UNLINKED";
}

function normalizeRoles(roles?: EmployeeManagementRole[]) {
  if (!roles?.length) {
    return ["EMPLOYEE"] satisfies EmployeeManagementRole[];
  }

  return roles;
}

function assertUniqueCognitoSubs() {
  const cognitoSubToUserId = new Map<string, string>();

  for (const user of userStore) {
    const cognitoSub = user.cognitoSub?.trim();
    if (!cognitoSub) {
      continue;
    }

    const existingUserId = cognitoSubToUserId.get(cognitoSub);
    if (existingUserId && existingUserId !== user.userId) {
      throw new Error(`Duplicate cognitoSub detected in mock data: ${cognitoSub}`);
    }

    cognitoSubToUserId.set(cognitoSub, user.userId);
  }
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

function normalizeCompanyId(companyId: string) {
  return companyId.trim().toLowerCase();
}

function isValidCompanyId(companyId: string) {
  return /^[a-z][a-z0-9-]{1,31}$/.test(companyId);
}

function isValidCompanyStatus(status: Company["status"]) {
  return status === "ACTIVE" || status === "INACTIVE" || status === "TRIAL";
}

function isValidCompanyPlan(plan: Company["plan"]) {
  return plan === "TRIAL" || plan === "STANDARD" || plan === "ENTERPRISE";
}

function toOperatorCompanySummary(company: Company): OperatorCompanySummary {
  const companyUsers = getCompanyUsers(company.companyId);

  return {
    companyId: company.companyId,
    companyName: company.shortName || company.name,
    legalName: company.name,
    shortName: company.shortName,
    status: company.status,
    plan: company.plan,
    employeeCount: companyUsers.length,
    activeEmployeeCount: company.activeEmployees,
    companyPointBalance: company.companyPointBalance,
    perEmployeeMonthlyFee: company.perEmployeeMonthlyFee,
    pointUnitLabel: company.pointUnitLabel ?? "pt",
    updatedAt: company.updatedAt,
  };
}

function validateCreateCompanyInput(input: CreateCompanyInput) {
  const companyId = normalizeCompanyId(input.companyId);
  const name = input.name.trim();
  const shortName = input.shortName?.trim();
  const perEmployeeMonthlyFee = input.perEmployeeMonthlyFee;
  const companyPointBalance = input.companyPointBalance;

  if (!companyId || !name) {
    throw new Error("companyId と企業名は必須です。");
  }

  if (!isValidCompanyId(companyId)) {
    throw new Error("companyId は英小文字で始まる英小文字・数字・ハイフンの 2-32 文字で入力してください。");
  }

  if (shortName && shortName.length > 40) {
    throw new Error("企業略称は 40 文字以内で入力してください。");
  }

  if (!isValidCompanyStatus(input.status)) {
    throw new Error("企業ステータスが不正です。");
  }

  if (!isValidCompanyPlan(input.plan)) {
    throw new Error("契約プランが不正です。");
  }

  if (!Number.isInteger(perEmployeeMonthlyFee) || perEmployeeMonthlyFee < 0) {
    throw new Error("月額単価は 0 以上の整数で入力してください。");
  }

  if (!Number.isInteger(companyPointBalance) || companyPointBalance < 0) {
    throw new Error("企業ポイント残高は 0 以上の整数で入力してください。");
  }

  if (companyStore.some((company) => company.companyId === companyId)) {
    throw new Error("同じ companyId の企業がすでに登録されています。");
  }
}

function getAllCompanyUsers(companyId: string) {
  return userStore.filter((item) => item.companyId === companyId);
}

function getCompanyUsers(companyId: string) {
  return getAllCompanyUsers(companyId).filter((item) => item.status !== "DELETED");
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
    loginId: normalizeLoginId(user.loginId, user.userId),
    departments: normalizeDepartmentNames(user.departments ?? (user.department ? [user.department] : [])),
    roles: normalizeRoles(user.roles),
    status: normalizeUserStatus(user.status, user.lastLoginAt) as EmployeeManagementStatus,
    authLinkStatus: getAuthLinkStatus(user.cognitoSub),
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

function isValidLoginId(loginId: string) {
  return /^[a-z0-9._-]{3,64}$/.test(loginId);
}

function validateCreateEmployeeInput(companyId: string, input: CreateEmployeeInput) {
  const name = input.name.trim();
  const loginId = input.loginId.trim().toLowerCase();
  const departments = normalizeDepartmentNames(input.departments);
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  const address = input.address.trim();
  const joinedAt = input.joinedAt.trim();
  const availableDepartments = getCompanyDepartments(companyId);

  if (!name || !loginId || !departments.length || !email || !phone || !address || !joinedAt) {
    throw new Error("必須項目を入力してください");
  }

  if (!isValidLoginId(loginId)) {
    throw new Error("ログインIDは英小文字・数字・._- のみで 3〜64 文字で入力してください");
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

  const loginIdExists = getCompanyUsers(companyId).some(
    (user) => normalizeLoginId(user.loginId, user.userId) === loginId
  );

  if (loginIdExists) {
    throw new Error("同じログインIDの従業員が既に存在します");
  }
}

function validateUpdateEmployeeInput(companyId: string, employee: RawMockUser, input: UpdateEmployeeInput) {
  const name = input.name.trim();
  const loginId = input.loginId.trim().toLowerCase();
  const departments = normalizeDepartmentNames(input.departments);
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  const address = input.address.trim();
  const joinedAt = input.joinedAt.trim();
  const pointAdjustment = input.pointAdjustment;
  const availableDepartments = getCompanyDepartments(companyId);
  const currentPointBalance = employee.currentPointBalance ?? 0;

  if (!name || !loginId || !departments.length || !email || !phone || !address || !joinedAt) {
    throw new Error("必須項目を入力してください");
  }

  if (!isValidLoginId(loginId)) {
    throw new Error("ログインIDは英小文字・数字・._- のみで 3〜64 文字で入力してください");
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

  const loginIdExists = getCompanyUsers(companyId).some(
    (user) => user.userId !== employee.userId && normalizeLoginId(user.loginId, user.userId) === loginId
  );

  if (loginIdExists) {
    throw new Error("同じログインIDの従業員が既に存在します");
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

export async function listOperatorCompaniesFromDynamoMock(): Promise<OperatorCompanySummary[]> {
  return companyStore
    .map((company) => toOperatorCompanySummary(company))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function createCompanyInDynamoMock(input: CreateCompanyInput): Promise<OperatorCompanySummary> {
  validateCreateCompanyInput(input);

  const now = new Date().toISOString();
  const companyId = normalizeCompanyId(input.companyId);
  const shortName = input.shortName?.trim();
  const createdCompany: Company = {
    companyId,
    name: input.name.trim(),
    shortName: shortName || undefined,
    status: input.status,
    plan: input.plan,
    perEmployeeMonthlyFee: input.perEmployeeMonthlyFee,
    companyPointBalance: input.companyPointBalance,
    totalEmployees: 0,
    activeEmployees: 0,
    pointUnitLabel: input.pointUnitLabel?.trim() || "pt",
    createdAt: now,
    updatedAt: now,
  };

  companyStore.unshift(createdCompany);
  departmentStore.set(companyId, []);

  return toOperatorCompanySummary(createdCompany);
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
    userId: getNextUserId(getAllCompanyUsers(companyId)),
    name: input.name.trim(),
    loginId: input.loginId.trim().toLowerCase(),
    departments: normalizeDepartmentNames(input.departments),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    address: input.address.trim(),
    joinedAt: input.joinedAt.trim(),
    currentPointBalance: 0,
    currentMonthCompletionRate: 0,
    roles: [input.role],
    status: "INVITED",
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
  targetUser.loginId = input.loginId.trim().toLowerCase();
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
