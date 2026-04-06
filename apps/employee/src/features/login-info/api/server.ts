import { toYYYYMMDDHHmmss } from "@correcre/lib";
import { getUserByCompanyAndUserId } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { joinNameParts } from "@correcre/lib/user-profile";

import type { LoginInfo } from "../model/types";

export async function getLoginInfoFromDynamo(companyId: string, userId: string): Promise<LoginInfo | null> {
  const user = await getUserByCompanyAndUserId(
    {
      region: readRequiredServerEnv("AWS_REGION"),
      tableName: readRequiredServerEnv("DDB_USER_TABLE_NAME"),
    },
    companyId,
    userId,
  );

  if (!user || user.status === "DELETED") {
    return null;
  }

  const lastLoginAt = user.lastLoginAt
    ? toYYYYMMDDHHmmss(new Date(user.lastLoginAt)).replace("T", " ").replaceAll("-", "/")
    : undefined;

  return {
    displayName: joinNameParts(user.lastName, user.firstName),
    departmentName: user.departmentName,
    lastLoginAt,
  };
}
