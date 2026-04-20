import { getCompanyById } from "@correcre/lib/dynamodb/company";
import { listDepartmentsByCompany } from "@correcre/lib/dynamodb/department";
import { listMissionsByCompany } from "@correcre/lib/dynamodb/mission";
import { listUsersByCompany } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { joinNameParts } from "@correcre/lib/user-profile";
import { toCompanySummary } from "@correcre/lib/company-management-server";
import type { DBUserItem } from "@correcre/types";

import type { AdminInfoAccountSummary, AdminInfoData, AdminInfoDepartmentItem } from "../model/types";

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

  const [company, departments, users, missions] = await Promise.all([
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
    listMissionsByCompany(
      {
        region,
        tableName: readRequiredServerEnv("DDB_MISSION_TABLE_NAME"),
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
    missions,
    account: toAccountSummary(currentAdminUser),
  };
}
