import { nowYYYYMM } from "@correcre/lib";
import { buildCompanyBillingHistory } from "@correcre/lib/company-billing";
import {
  buildCompanyInvoice,
  DEFAULT_INVOICE_ISSUER_NAME,
  toInvoiceIssuer,
  type InvoiceIssuer,
} from "@correcre/lib/company-invoice";
import { getCompanyById } from "@correcre/lib/dynamodb/company";
import { listDepartmentsByCompany } from "@correcre/lib/dynamodb/department";
import { getInvoiceIssuerSetting, resolveSystemSettingTableName } from "@correcre/lib/dynamodb/system-setting";
import { listUsersByCompany } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { joinNameParts } from "@correcre/lib/user-profile";
import { toCompanySummary } from "@correcre/lib/company-management-server";
import type { DBUserItem } from "@correcre/types";

import type {
  AdminInfoAccountSummary,
  AdminInfoData,
  AdminInfoDepartmentItem,
  AdminInfoUserCounts,
  CompanyInvoiceData,
} from "../model/types";

function toUserCounts(users: DBUserItem[]): AdminInfoUserCounts {
  const nonDeletedUsers = users.filter((user) => user.status !== "DELETED");
  return {
    registered: nonDeletedUsers.length,
    active: nonDeletedUsers.filter((user) => user.status === "ACTIVE").length,
    inactive: nonDeletedUsers.filter((user) => user.status === "INACTIVE").length,
  };
}

function toDepartmentItems(
  companyId: string,
  departments: Awaited<ReturnType<typeof listDepartmentsByCompany>>,
  users: DBUserItem[],
) {
  const currentUsers = users.filter((user) => user.status !== "DELETED");

  return departments
    .filter((department) => department.companyId === companyId)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "ja"))
    .map<AdminInfoDepartmentItem>((department) => {
      const employees = currentUsers
        .filter(
          (user) =>
            user.departmentId === department.departmentId ||
            (!user.departmentId && user.departmentName?.trim() === department.name),
        )
        .map((user) => ({
          userId: user.userId,
          name: joinNameParts(user.lastName, user.firstName) || user.email,
          email: user.email,
        }))
        .sort((left, right) => left.name.localeCompare(right.name, "ja") || left.email.localeCompare(right.email, "ja"));

      return {
        departmentId: department.departmentId,
        name: department.name,
        status: department.status,
        sortOrder: department.sortOrder,
        employeeCount: employees.length,
        employees,
      };
    });
}

function toAccountSummary(currentAdminUser: DBUserItem): AdminInfoAccountSummary {
  return {
    name: joinNameParts(currentAdminUser.lastName, currentAdminUser.firstName),
    email: currentAdminUser.email,
    departmentName: currentAdminUser.departmentName,
    roles: currentAdminUser.roles,
    joinedAt: currentAdminUser.joinedAt,
    lastLoginAt: currentAdminUser.lastLoginAt,
  };
}

export async function getAdminInfoData(currentAdminUser: DBUserItem): Promise<AdminInfoData> {
  const region = readRequiredServerEnv("AWS_REGION");
  const companyId = currentAdminUser.companyId;

  // ミッション項目は「ミッション項目」タブが開いたときに /api/missions から読み込む（予約の反映もそこで行う）。
  const [company, departments, users] = await Promise.all([
    getCompanyById(
      {
        region,
        tableName: readRequiredServerEnv("DDB_COMPANY_TABLE_NAME"),
      },
      companyId,
    ),
    listDepartmentsByCompany(
      {
        region,
        tableName: readRequiredServerEnv("DDB_DEPARTMENT_TABLE_NAME"),
      },
      companyId,
    ),
    listUsersByCompany(
      {
        region,
        tableName: readRequiredServerEnv("DDB_USER_TABLE_NAME"),
      },
      companyId,
    ),
  ]);

  if (!company) {
    throw new Error("Company not found");
  }

  return {
    company,
    editableCompany: toCompanySummary(company),
    departments: toDepartmentItems(companyId, departments, users),
    account: toAccountSummary(currentAdminUser),
    userCounts: toUserCounts(users),
    billingRows: buildCompanyBillingHistory(company, { currentMonth: nowYYYYMM() }),
  };
}

// 発行元情報（運用者の「設定」）。未設定・テーブル未作成の場合は会社名だけにする。
async function resolveInvoiceIssuer(region: string): Promise<InvoiceIssuer> {
  const tableName = resolveSystemSettingTableName();
  const setting = tableName ? await getInvoiceIssuerSetting({ region, tableName }) : null;
  if (!setting) {
    return { companyName: DEFAULT_INVOICE_ISSUER_NAME };
  }
  return toInvoiceIssuer(setting);
}

// 管理者の会社の、指定月の請求書。請求書を出せない月（未確定・請求なし・請求開始前）は null。
// 会社はセッションのユーザーから決めるため、他社の請求書は出力できない。
export async function getCompanyInvoiceData(
  currentAdminUser: DBUserItem,
  month: string,
): Promise<CompanyInvoiceData | null> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return null;
  }

  const region = readRequiredServerEnv("AWS_REGION");
  const [company, issuer] = await Promise.all([
    getCompanyById({ region, tableName: readRequiredServerEnv("DDB_COMPANY_TABLE_NAME") }, currentAdminUser.companyId),
    resolveInvoiceIssuer(region),
  ]);

  if (!company) {
    return null;
  }

  const row = buildCompanyBillingHistory(company, { currentMonth: nowYYYYMM() }).find((item) => item.month === month);
  const invoice = row ? buildCompanyInvoice(company.companyId, row) : null;
  if (!invoice) {
    return null;
  }

  return {
    invoice,
    issuer,
    recipient: {
      companyName: company.name,
      address: company.address,
      contactName: company.contactName,
    },
  };
}
