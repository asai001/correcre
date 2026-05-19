import { getCompanyById } from "@correcre/lib/dynamodb/company";
import { getUserByCompanyAndUserId } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { joinNameParts } from "@correcre/lib/user-profile";

import type { LoginInfo } from "../model/types";

export async function getLoginInfoFromDynamo(companyId: string, userId: string): Promise<LoginInfo | null> {
  const [user, company] = await Promise.all([
    getUserByCompanyAndUserId(
      {
        region: readRequiredServerEnv("AWS_REGION"),
        tableName: readRequiredServerEnv("DDB_USER_TABLE_NAME"),
      },
      companyId,
      userId,
    ),
    getCompanyById(
      {
        region: readRequiredServerEnv("AWS_REGION"),
        tableName: readRequiredServerEnv("DDB_COMPANY_TABLE_NAME"),
      },
      companyId,
    ),
  ]);

  if (!user || user.status === "DELETED" || !user.roles.includes("ADMIN")) {
    return null;
  }

  return {
    name: joinNameParts(user.lastName, user.firstName),
    activeEmployees: company?.activeEmployees ?? 0,
  };
}
