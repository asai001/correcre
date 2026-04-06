import { randomUUID } from "node:crypto";
import { TransactWriteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamoDocumentClient } from "@correcre/lib/dynamodb/client";
import { getCompanyById, listCompanies, putCompany } from "@correcre/lib/dynamodb/company";
import {
  buildDepartmentSk,
  deleteDepartment,
  listDepartmentsByCompany,
  putDepartment,
  updateDepartmentName,
} from "@correcre/lib/dynamodb/department";
import {
  buildUserByDepartmentGsiPk,
  buildUserByDepartmentGsiSk,
  buildUserByEmailGsiPk,
  buildUserSk,
  getUserByCompanyAndUserId,
  listUsersByCompany,
  listUsersByEmail,
  putUser,
} from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { joinNameKanaParts, joinNameParts, splitFullName } from "@correcre/lib/user-profile";

import type { Company, DBUserAddress, DBUserItem, DBUserRole, Department } from "@correcre/types";
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

type RuntimeConfig = {
  region: string;
  userTableName: string;
  companyTableName: string;
  departmentTableName: string;
};

type NormalizedEmployeeInput = {
  name: string;
  lastName: string;
  firstName: string;
  lastNameKana: string;
  firstNameKana: string;
  department: Pick<Department, "departmentId" | "name">;
  email: string;
  phoneNumber?: string;
  address?: DBUserAddress;
  roles: DBUserRole[];
  joinedAt: string;
};

function getRuntimeConfig(): RuntimeConfig {
  return {
    region: readRequiredServerEnv("AWS_REGION"),
    userTableName: readRequiredServerEnv("DDB_USER_TABLE_NAME"),
    companyTableName: readRequiredServerEnv("DDB_COMPANY_TABLE_NAME"),
    departmentTableName: readRequiredServerEnv("DDB_DEPARTMENT_TABLE_NAME"),
  };
}

function isEmployeeManagementRole(role: DBUserRole): role is EmployeeManagementRole {
  return role === "EMPLOYEE" || role === "MANAGER" || role === "ADMIN" || role === "OPERATOR";
}

function normalizeRoles(roles?: DBUserRole[]) {
  if (!roles) {
    return ["EMPLOYEE"] satisfies EmployeeManagementRole[];
  }

  return roles.filter(isEmployeeManagementRole);
}

function normalizeUserStatus(status: DBUserItem["status"]): EmployeeManagementStatus | "DELETED" {
  if (status === "DELETED") {
    return "DELETED";
  }

  if (status === "INACTIVE") {
    return "SUSPENDED";
  }

  if (status === "ACTIVE") {
    return "ACTIVE";
  }

  return "INVITED";
}

function getAuthLinkStatus(cognitoSub?: string): EmployeeAuthLinkStatus {
  return cognitoSub?.trim() ? "LINKED" : "UNLINKED";
}

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function getNameFields(user: DBUserItem) {
  const fallback = splitFullName(user.name);

  return {
    lastName: user.lastName?.trim() ?? fallback.lastName,
    firstName: user.firstName?.trim() ?? fallback.firstName,
    lastNameKana: user.lastNameKana?.trim() ?? "",
    firstNameKana: user.firstNameKana?.trim() ?? "",
  };
}

function toEmployee(user: DBUserItem): EmployeeManagementEmployee | null {
  const roles = normalizeRoles(user.roles);

  if (!roles.length) {
    return null;
  }

  const { lastName, firstName, lastNameKana, firstNameKana } = getNameFields(user);
  const name = joinNameParts(lastName, firstName, user.name);
  const nameKana = joinNameKanaParts(lastNameKana, firstNameKana);

  return {
    userId: user.userId,
    name,
    nameKana: nameKana || undefined,
    lastName,
    firstName,
    lastNameKana,
    firstNameKana,
    departmentName: user.departmentName,
    roles,
    status: normalizeUserStatus(user.status) as EmployeeManagementStatus,
    authLinkStatus: getAuthLinkStatus(user.cognitoSub),
    email: user.email,
    phoneNumber: normalizeOptionalText(user.phoneNumber),
    address: user.address,
    pointBalance: user.currentPointBalance ?? 0,
    completionRate: user.currentMonthCompletionRate ?? 0,
    joinedAt: user.joinedAt,
    lastLoginAt: user.lastLoginAt,
  };
}

function getAdminName(users: DBUserItem[], adminUserId?: string) {
  const selectedAdmin =
    users.find((user) => user.userId === adminUserId && normalizeRoles(user.roles).includes("ADMIN")) ??
    users.find((user) => normalizeRoles(user.roles).includes("ADMIN")) ??
    users[0];

  return selectedAdmin?.name ?? "管理者";
}

function getNextUserId(users: DBUserItem[]) {
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

function getNextDepartmentId(departments: Department[]) {
  const nextNumber =
    departments.reduce((max, department) => {
      const match = /^dept-(\d+)$/.exec(department.departmentId);
      if (!match) {
        return max;
      }

      return Math.max(max, Number(match[1]));
    }, 0) + 1;

  return `dept-${String(nextNumber).padStart(3, "0")}`;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidKana(value: string) {
  return /^[ァ-ヶー－\s　]+$/.test(value);
}

function isValidPhoneNumber(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, "");
  return /^[0-9-]+$/.test(phoneNumber) && digits.length >= 10 && digits.length <= 11;
}

function isValidCompanyStatus(status: Company["status"]) {
  return status === "ACTIVE" || status === "INACTIVE" || status === "TRIAL";
}

function isValidCompanyPlan(plan: Company["plan"]) {
  return plan === "TRIAL" || plan === "STANDARD" || plan === "ENTERPRISE";
}

function requireDepartment(
  departmentName: string,
  availableDepartments: Department[],
): Pick<Department, "departmentId" | "name"> {
  const normalizedDepartmentName = departmentName.trim();

  if (!normalizedDepartmentName) {
    throw new Error("所属部署を選択してください");
  }

  const department = availableDepartments.find(
    (item) => item.name === normalizedDepartmentName && item.status !== "INACTIVE",
  );

  if (!department) {
    throw new Error("存在しない部署が選択されています");
  }

  return {
    departmentId: department.departmentId,
    name: department.name,
  };
}

async function assertUniqueEmail(config: RuntimeConfig, email: string, currentUserId?: string) {
  const existingUsers = (await listUsersByEmail(
    {
      region: config.region,
      tableName: config.userTableName,
    },
    email,
  )).filter((user) => user.status !== "DELETED" && user.userId !== currentUserId);

  if (existingUsers.length > 0) {
    throw new Error("同じメールアドレスのユーザーがすでに登録されています");
  }
}

function buildAddress(
  input: Pick<CreateEmployeeInput, "postalCodeFirstHalf" | "postalCodeSecondHalf" | "prefecture" | "city" | "building">,
): DBUserAddress | undefined {
  const postalCodeFirstHalf = input.postalCodeFirstHalf?.trim() ?? "";
  const postalCodeSecondHalf = input.postalCodeSecondHalf?.trim() ?? "";
  const prefecture = input.prefecture?.trim() ?? "";
  const city = input.city?.trim() ?? "";
  const building = normalizeOptionalText(input.building);
  const hasAnyAddressField = [postalCodeFirstHalf, postalCodeSecondHalf, prefecture, city, building].some(Boolean);

  if (!hasAnyAddressField) {
    return undefined;
  }

  const hasAnyPostalCodeField = Boolean(postalCodeFirstHalf || postalCodeSecondHalf);
  if (hasAnyPostalCodeField && (!/^\d{3}$/.test(postalCodeFirstHalf) || !/^\d{4}$/.test(postalCodeSecondHalf))) {
    throw new Error("郵便番号は 3 桁と 4 桁の数字で入力してください");
  }

  return {
    postalCode: hasAnyPostalCodeField ? `${postalCodeFirstHalf}${postalCodeSecondHalf}` : undefined,
    prefecture: prefecture || undefined,
    city: city || undefined,
    building,
  };
}

function normalizeEmployeeInput(input: CreateEmployeeInput | UpdateEmployeeInput, departments: Department[]): NormalizedEmployeeInput {
  const lastName = input.lastName.trim();
  const firstName = input.firstName.trim();
  const lastNameKana = input.lastNameKana.trim();
  const firstNameKana = input.firstNameKana.trim();
  const email = input.email.trim().toLowerCase();
  const joinedAt = input.joinedAt.trim();
  const phoneNumber = normalizeOptionalText(input.phoneNumber);
  const roles = Array.from(new Set(input.roles));

  if (!lastName || !firstName || !lastNameKana || !firstNameKana || !email || !joinedAt || roles.length === 0) {
    throw new Error("必須項目を入力してください");
  }

  if (!isValidKana(lastNameKana) || !isValidKana(firstNameKana)) {
    throw new Error("フリガナは全角カタカナで入力してください");
  }

  if (!isValidEmail(email)) {
    throw new Error("メールアドレスの形式が正しくありません");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(joinedAt)) {
    throw new Error("入社日は YYYY-MM-DD 形式で入力してください");
  }

  if (phoneNumber && !isValidPhoneNumber(phoneNumber)) {
    throw new Error("電話番号は 10 桁または 11 桁の数字で入力してください");
  }

  return {
    name: joinNameParts(lastName, firstName),
    lastName,
    firstName,
    lastNameKana,
    firstNameKana,
    department: requireDepartment(input.departmentName, departments),
    email,
    phoneNumber,
    address: buildAddress(input),
    roles,
    joinedAt,
  };
}

async function getCompanyOrThrow(config: RuntimeConfig, companyId: string) {
  const company = await getCompanyById(
    {
      region: config.region,
      tableName: config.companyTableName,
    },
    companyId,
  );

  if (!company) {
    throw new Error("Company not found");
  }

  return company;
}

async function syncCompanyUserCounts(config: RuntimeConfig, companyId: string, updatedAt: string) {
  const users = await listUsersByCompany(
    {
      region: config.region,
      tableName: config.userTableName,
    },
    companyId,
  );
  const currentUsers = users.filter((user) => user.status !== "DELETED");
  const activeUsers = currentUsers.filter((user) => user.status === "ACTIVE");
  const client = getDynamoDocumentClient(config.region);

  await client.send(
    new UpdateCommand({
      TableName: config.companyTableName,
      Key: {
        companyId,
      },
      UpdateExpression: "SET totalEmployees = :totalEmployees, activeEmployees = :activeEmployees, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":totalEmployees": currentUsers.length,
        ":activeEmployees": activeUsers.length,
        ":updatedAt": updatedAt,
      },
    }),
  );
}

async function touchCompany(config: RuntimeConfig, companyId: string, updatedAt: string) {
  const client = getDynamoDocumentClient(config.region);

  await client.send(
    new UpdateCommand({
      TableName: config.companyTableName,
      Key: {
        companyId,
      },
      UpdateExpression: "SET updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":updatedAt": updatedAt,
      },
    }),
  );
}

function toOperatorCompanySummary(company: Company): OperatorCompanySummary {
  return {
    companyId: company.companyId,
    companyName: company.shortName || company.name,
    legalName: company.name,
    shortName: company.shortName,
    status: company.status,
    plan: company.plan,
    employeeCount: company.totalEmployees ?? company.activeEmployees,
    activeEmployeeCount: company.activeEmployees,
    companyPointBalance: company.companyPointBalance,
    perEmployeeMonthlyFee: company.perEmployeeMonthlyFee,
    pointUnitLabel: company.pointUnitLabel ?? "pt",
    updatedAt: company.updatedAt,
  };
}

function createCompanyId(existingCompanies: Company[]) {
  const existingIds = new Set(existingCompanies.map((company) => company.companyId));

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const companyId = randomUUID();
    if (!existingIds.has(companyId)) {
      return companyId;
    }
  }

  throw new Error("会社IDの自動採番に失敗しました");
}

function validateCreateCompanyInput(input: CreateCompanyInput) {
  const name = input.name.trim();
  const perEmployeeMonthlyFee = input.perEmployeeMonthlyFee;
  const companyPointBalance = input.companyPointBalance;

  if (!name) {
    throw new Error("会社名は必須です");
  }

  if (!isValidCompanyStatus(input.status)) {
    throw new Error("会社ステータスが不正です");
  }

  if (!isValidCompanyPlan(input.plan)) {
    throw new Error("プランが不正です");
  }

  if (!Number.isInteger(perEmployeeMonthlyFee) || perEmployeeMonthlyFee < 0) {
    throw new Error("月額単価は 0 以上の整数で入力してください");
  }

  if (!Number.isInteger(companyPointBalance) || companyPointBalance < 0) {
    throw new Error("会社ポイント残高は 0 以上の整数で入力してください");
  }
}

export async function listOperatorCompaniesFromDynamo(): Promise<OperatorCompanySummary[]> {
  const companies = await listCompanies(
    {
      region: readRequiredServerEnv("AWS_REGION"),
      tableName: readRequiredServerEnv("DDB_COMPANY_TABLE_NAME"),
    },
  );

  return companies
    .map((company) => toOperatorCompanySummary(company))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function createCompanyInDynamo(input: CreateCompanyInput): Promise<OperatorCompanySummary> {
  const config = getRuntimeConfig();
  const companies = await listCompanies(
    {
      region: config.region,
      tableName: config.companyTableName,
    },
  );
  validateCreateCompanyInput(input);

  const now = new Date().toISOString();
  const companyId = createCompanyId(companies);
  const createdCompany: Company = {
    companyId,
    name: input.name.trim(),
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

  await putCompany(
    {
      region: config.region,
      tableName: config.companyTableName,
    },
    createdCompany,
  );

  return toOperatorCompanySummary(createdCompany);
}

export async function getEmployeeManagementSummaryFromDynamo(
  companyId: string,
  adminUserId?: string,
): Promise<EmployeeManagementSummary> {
  const config = getRuntimeConfig();
  const [company, users, departments] = await Promise.all([
    getCompanyOrThrow(config, companyId),
    listUsersByCompany(
      {
        region: config.region,
        tableName: config.userTableName,
      },
      companyId,
    ),
    listDepartmentsByCompany(
      {
        region: config.region,
        tableName: config.departmentTableName,
      },
      companyId,
    ),
  ]);

  const currentUsers = users.filter((user) => user.status !== "DELETED");
  const employees = currentUsers
    .map((user) => toEmployee(user))
    .filter((employee): employee is EmployeeManagementEmployee => employee !== null);
  const totalEmployeePoints = employees.reduce((sum, employee) => sum + employee.pointBalance, 0);
  const totalCompletionRate = employees.reduce((sum, employee) => sum + employee.completionRate, 0);
  const departmentOptions: EmployeeDepartmentOption[] = departments
    .filter((department) => department.status !== "INACTIVE")
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "ja"))
    .map((department) => ({
      name: department.name,
      employeeCount: currentUsers.filter((user) => user.departmentId === department.departmentId).length,
    }));

  return {
    companyId,
    companyName: company.shortName || company.name,
    adminName: getAdminName(currentUsers, adminUserId),
    updatedAt: company.updatedAt,
    employeeCount: employees.length,
    departmentCount: departmentOptions.length,
    totalEmployeePoints,
    companyPointBalance: company.companyPointBalance,
    averageCompletionRate: employees.length ? Math.round(totalCompletionRate / employees.length) : 0,
    pointUnitLabel: company.pointUnitLabel ?? "pt",
    departmentOptions,
    employees,
  };
}

export async function createEmployeeInDynamo(
  companyId: string,
  input: CreateEmployeeInput,
): Promise<EmployeeManagementEmployee> {
  const config = getRuntimeConfig();
  const [, companyUsers, departments] = await Promise.all([
    getCompanyOrThrow(config, companyId),
    listUsersByCompany(
      {
        region: config.region,
        tableName: config.userTableName,
      },
      companyId,
    ),
    listDepartmentsByCompany(
      {
        region: config.region,
        tableName: config.departmentTableName,
      },
      companyId,
    ),
  ]);

  const normalizedInput = normalizeEmployeeInput(input, departments);
  await assertUniqueEmail(config, normalizedInput.email);

  const now = new Date().toISOString();
  const userId = getNextUserId(companyUsers);
  const createdUser: DBUserItem = {
    companyId,
    sk: buildUserSk(userId),
    userId,
    name: normalizedInput.name,
    lastName: normalizedInput.lastName,
    firstName: normalizedInput.firstName,
    lastNameKana: normalizedInput.lastNameKana,
    firstNameKana: normalizedInput.firstNameKana,
    email: normalizedInput.email,
    phoneNumber: normalizedInput.phoneNumber,
    address: normalizedInput.address,
    departmentId: normalizedInput.department.departmentId,
    departmentName: normalizedInput.department.name,
    roles: normalizedInput.roles,
    status: "INVITED",
    joinedAt: normalizedInput.joinedAt,
    currentPointBalance: 0,
    currentMonthCompletionRate: 0,
    createdAt: now,
    updatedAt: now,
    gsi2pk: buildUserByEmailGsiPk(normalizedInput.email),
    gsi3pk: buildUserByDepartmentGsiPk(companyId, normalizedInput.department.departmentId),
    gsi3sk: buildUserByDepartmentGsiSk(userId),
  };

  await putUser(
    {
      region: config.region,
      tableName: config.userTableName,
    },
    createdUser,
  );
  await syncCompanyUserCounts(config, companyId, now);

  const createdEmployee = toEmployee(createdUser);

  if (!createdEmployee) {
    throw new Error("Created user does not have an employee-management role.");
  }

  return createdEmployee;
}

export async function updateEmployeeInDynamo(
  companyId: string,
  input: UpdateEmployeeInput,
): Promise<EmployeeManagementEmployee> {
  const config = getRuntimeConfig();
  const [company, targetUser, departments] = await Promise.all([
    getCompanyOrThrow(config, companyId),
    getUserByCompanyAndUserId(
      {
        region: config.region,
        tableName: config.userTableName,
      },
      companyId,
      input.userId,
    ),
    listDepartmentsByCompany(
      {
        region: config.region,
        tableName: config.departmentTableName,
      },
      companyId,
    ),
  ]);

  if (!targetUser || targetUser.status === "DELETED") {
    throw new Error("Employee not found");
  }

  const normalizedInput = normalizeEmployeeInput(input, departments);

  if (!Number.isInteger(input.pointAdjustment)) {
    throw new Error("ポイント調整は整数で入力してください");
  }

  await assertUniqueEmail(config, normalizedInput.email, targetUser.userId);

  const nextUserPointBalance = (targetUser.currentPointBalance ?? 0) + input.pointAdjustment;
  const nextCompanyPointBalance = company.companyPointBalance - input.pointAdjustment;

  if (nextUserPointBalance < 0) {
    throw new Error("調整後のポイントが 0 未満になるため更新できません");
  }

  if (nextCompanyPointBalance < 0) {
    throw new Error("会社ポイントが不足しているため更新できません");
  }

  const now = new Date().toISOString();
  const client = getDynamoDocumentClient(config.region);
  const userSetExpressions = [
    "#name = :name",
    "lastName = :lastName",
    "firstName = :firstName",
    "lastNameKana = :lastNameKana",
    "firstNameKana = :firstNameKana",
    "email = :email",
    "departmentId = :departmentId",
    "departmentName = :departmentName",
    "roles = :roles",
    "joinedAt = :joinedAt",
    "currentPointBalance = :nextUserPointBalance",
    "updatedAt = :updatedAt",
    "gsi2pk = :gsi2pk",
    "gsi3pk = :gsi3pk",
    "gsi3sk = :gsi3sk",
  ];
  const userRemoveExpressions = ["loginId"];
  const userExpressionAttributeNames = {
    "#name": "name",
  };
  const userExpressionAttributeValues: Record<string, unknown> = {
    ":currentPointBalance": targetUser.currentPointBalance ?? 0,
    ":name": normalizedInput.name,
    ":lastName": normalizedInput.lastName,
    ":firstName": normalizedInput.firstName,
    ":lastNameKana": normalizedInput.lastNameKana,
    ":firstNameKana": normalizedInput.firstNameKana,
    ":email": normalizedInput.email,
    ":departmentId": normalizedInput.department.departmentId,
    ":departmentName": normalizedInput.department.name,
    ":roles": normalizedInput.roles,
    ":joinedAt": normalizedInput.joinedAt,
    ":nextUserPointBalance": nextUserPointBalance,
    ":updatedAt": now,
    ":gsi2pk": buildUserByEmailGsiPk(normalizedInput.email),
    ":gsi3pk": buildUserByDepartmentGsiPk(companyId, normalizedInput.department.departmentId),
    ":gsi3sk": buildUserByDepartmentGsiSk(targetUser.userId),
  };

  if (normalizedInput.phoneNumber) {
    userSetExpressions.push("phoneNumber = :phoneNumber");
    userExpressionAttributeValues[":phoneNumber"] = normalizedInput.phoneNumber;
  } else {
    userRemoveExpressions.push("phoneNumber");
  }

  if (normalizedInput.address) {
    userSetExpressions.push("address = :address");
    userExpressionAttributeValues[":address"] = normalizedInput.address;
  } else {
    userRemoveExpressions.push("address");
  }

  await client.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: config.userTableName,
            Key: {
              companyId,
              sk: buildUserSk(targetUser.userId),
            },
            ConditionExpression: "currentPointBalance = :currentPointBalance",
            UpdateExpression: `${userSetExpressions.length ? `SET ${userSetExpressions.join(", ")}` : ""}${userRemoveExpressions.length ? ` REMOVE ${userRemoveExpressions.join(", ")}` : ""}`,
            ExpressionAttributeNames: userExpressionAttributeNames,
            ExpressionAttributeValues: userExpressionAttributeValues,
          },
        },
        {
          Update: {
            TableName: config.companyTableName,
            Key: {
              companyId,
            },
            ConditionExpression: "companyPointBalance = :currentCompanyPointBalance",
            UpdateExpression: "SET companyPointBalance = :nextCompanyPointBalance, updatedAt = :updatedAt",
            ExpressionAttributeValues: {
              ":currentCompanyPointBalance": company.companyPointBalance,
              ":nextCompanyPointBalance": nextCompanyPointBalance,
              ":updatedAt": now,
            },
          },
        },
      ],
    }),
  );

  const updatedEmployee = toEmployee({
    ...targetUser,
    name: normalizedInput.name,
    lastName: normalizedInput.lastName,
    firstName: normalizedInput.firstName,
    lastNameKana: normalizedInput.lastNameKana,
    firstNameKana: normalizedInput.firstNameKana,
    email: normalizedInput.email,
    phoneNumber: normalizedInput.phoneNumber,
    address: normalizedInput.address,
    departmentId: normalizedInput.department.departmentId,
    departmentName: normalizedInput.department.name,
    roles: normalizedInput.roles,
    joinedAt: normalizedInput.joinedAt,
    currentPointBalance: nextUserPointBalance,
    updatedAt: now,
    gsi2pk: buildUserByEmailGsiPk(normalizedInput.email),
    gsi3pk: buildUserByDepartmentGsiPk(companyId, normalizedInput.department.departmentId),
    gsi3sk: buildUserByDepartmentGsiSk(targetUser.userId),
  });

  if (!updatedEmployee) {
    throw new Error("Updated user does not have an employee-management role.");
  }

  return updatedEmployee;
}

export async function deleteEmployeeInDynamo(companyId: string, input: DeleteEmployeeInput): Promise<void> {
  const config = getRuntimeConfig();
  const targetUser = await getUserByCompanyAndUserId(
    {
      region: config.region,
      tableName: config.userTableName,
    },
    companyId,
    input.userId.trim(),
  );

  if (!targetUser || targetUser.status === "DELETED") {
    throw new Error("Employee not found");
  }

  const now = new Date().toISOString();
  const client = getDynamoDocumentClient(config.region);

  await client.send(
    new UpdateCommand({
      TableName: config.userTableName,
      Key: {
        companyId,
        sk: buildUserSk(targetUser.userId),
      },
      UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":status": "DELETED",
        ":updatedAt": now,
      },
    }),
  );
  await syncCompanyUserCounts(config, companyId, now);
}

export async function createDepartmentInDynamo(companyId: string, input: CreateDepartmentInput): Promise<void> {
  const config = getRuntimeConfig();
  await getCompanyOrThrow(config, companyId);

  const name = input.name.trim();
  if (!name) {
    throw new Error("部署名を入力してください");
  }

  const departments = await listDepartmentsByCompany(
    {
      region: config.region,
      tableName: config.departmentTableName,
    },
    companyId,
  );

  if (departments.some((department) => department.name === name)) {
    throw new Error("同じ部署名がすでに登録されています");
  }

  const now = new Date().toISOString();
  const departmentId = getNextDepartmentId(departments);
  await putDepartment(
    {
      region: config.region,
      tableName: config.departmentTableName,
    },
    {
      companyId,
      sk: buildDepartmentSk(departmentId),
      departmentId,
      name,
      status: "ACTIVE",
      sortOrder: departments.length,
      createdAt: now,
      updatedAt: now,
    },
  );
  await touchCompany(config, companyId, now);
}

export async function renameDepartmentInDynamo(companyId: string, input: RenameDepartmentInput): Promise<void> {
  const config = getRuntimeConfig();
  await getCompanyOrThrow(config, companyId);

  const currentName = input.currentName.trim();
  const nextName = input.nextName.trim();

  if (!currentName || !nextName) {
    throw new Error("部署名を入力してください");
  }

  const [departments, users] = await Promise.all([
    listDepartmentsByCompany(
      {
        region: config.region,
        tableName: config.departmentTableName,
      },
      companyId,
    ),
    listUsersByCompany(
      {
        region: config.region,
        tableName: config.userTableName,
      },
      companyId,
    ),
  ]);

  const targetDepartment = departments.find((department) => department.name === currentName);
  if (!targetDepartment) {
    throw new Error("変更対象の部署が見つかりません");
  }

  if (currentName !== nextName && departments.some((department) => department.name === nextName)) {
    throw new Error("同じ部署名がすでに登録されています");
  }

  const now = new Date().toISOString();
  await updateDepartmentName(
    {
      region: config.region,
      tableName: config.departmentTableName,
    },
    companyId,
    targetDepartment.departmentId,
    nextName,
    now,
  );

  const client = getDynamoDocumentClient(config.region);
  const affectedUsers = users.filter(
    (user) => user.status !== "DELETED" && user.departmentId === targetDepartment.departmentId,
  );
  await Promise.all(
    affectedUsers.map((user) =>
      client.send(
        new UpdateCommand({
          TableName: config.userTableName,
          Key: {
            companyId,
            sk: buildUserSk(user.userId),
          },
          UpdateExpression: "SET departmentName = :departmentName, updatedAt = :updatedAt",
          ExpressionAttributeValues: {
            ":departmentName": nextName,
            ":updatedAt": now,
          },
        }),
      ),
    ),
  );
  await touchCompany(config, companyId, now);
}

export async function deleteDepartmentInDynamo(companyId: string, departmentName: string): Promise<void> {
  const config = getRuntimeConfig();
  await getCompanyOrThrow(config, companyId);

  const normalizedName = departmentName.trim();
  if (!normalizedName) {
    throw new Error("削除対象の部署名が不正です");
  }

  const [departments, users] = await Promise.all([
    listDepartmentsByCompany(
      {
        region: config.region,
        tableName: config.departmentTableName,
      },
      companyId,
    ),
    listUsersByCompany(
      {
        region: config.region,
        tableName: config.userTableName,
      },
      companyId,
    ),
  ]);

  const targetDepartment = departments.find((department) => department.name === normalizedName);
  if (!targetDepartment) {
    throw new Error("削除対象の部署が見つかりません");
  }

  const employeeUsingDepartment = users.some(
    (user) => user.status !== "DELETED" && user.departmentId === targetDepartment.departmentId,
  );

  if (employeeUsingDepartment) {
    throw new Error("所属中のユーザーがいるため削除できません");
  }

  const now = new Date().toISOString();
  await deleteDepartment(
    {
      region: config.region,
      tableName: config.departmentTableName,
    },
    companyId,
    targetDepartment.departmentId,
  );
  await touchCompany(config, companyId, now);
}
