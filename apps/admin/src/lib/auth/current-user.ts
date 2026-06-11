import "server-only";

import { redirect } from "next/navigation";

import { buildAwsCredentialErrorMessage, isAwsCredentialError } from "@correcre/lib/aws/credentials";
import { getCompanyById } from "@correcre/lib/dynamodb/company";
import { listUsersByCognitoSub } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import type { DBUserItem } from "@correcre/types";

import { ADMIN_LOGIN_PATH } from "./constants";
import { getAdminSession } from "./session";
import type { AdminSession } from "./verify-token";

export async function getAdminUserForSession(session: AdminSession): Promise<DBUserItem | null> {
  const cognitoSub = session.payload.sub?.trim();

  if (!cognitoSub) {
    return null;
  }

  let users: DBUserItem[];

  try {
    users = await listUsersByCognitoSub(
      {
        region: readRequiredServerEnv("AWS_REGION"),
        tableName: readRequiredServerEnv("DDB_USER_TABLE_NAME"),
      },
      cognitoSub,
    );
  } catch (error) {
    if (isAwsCredentialError(error)) {
      throw new Error(buildAwsCredentialErrorMessage(), { cause: error });
    }

    throw error;
  }

  const user = users.find((user) => user.status !== "DELETED" && user.roles.includes("ADMIN")) ?? null;

  if (!user) {
    return null;
  }

  // 所属企業が無効化（INACTIVE）されている場合はログイン・アクセスを許可しない。
  const company = await getCompanyById(
    {
      region: readRequiredServerEnv("AWS_REGION"),
      tableName: readRequiredServerEnv("DDB_COMPANY_TABLE_NAME"),
    },
    user.companyId,
  );

  if (company?.status === "INACTIVE") {
    return null;
  }

  return user;
}

export async function requireCurrentAdminUser() {
  const session = await getAdminSession();

  if (!session) {
    redirect(ADMIN_LOGIN_PATH);
  }

  const user = await getAdminUserForSession(session);

  if (!user) {
    throw new Error("Admin user was not found in the DynamoDB User table.");
  }

  return user;
}
