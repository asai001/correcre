import "server-only";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { buildAwsCredentialErrorMessage, isAwsCredentialError } from "@correcre/lib/aws/credentials";
import { getCompanyById } from "@correcre/lib/dynamodb/company";
import { listUsersByCognitoSub } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import type { DBUserItem } from "@correcre/types";

import { buildClearEmployeeSessionRedirect } from "./redirect";
import { getEmployeeSession } from "./session";
import type { EmployeeSession } from "./verify-token";

export type EmployeeSessionUserLookup =
  | { allowed: true; user: DBUserItem }
  | { allowed: false; reason: "user_not_found" | "company_inactive" };

export async function resolveEmployeeUserForSession(session: EmployeeSession): Promise<EmployeeSessionUserLookup> {
  const cognitoSub = session.payload.sub?.trim();

  if (!cognitoSub) {
    return { allowed: false, reason: "user_not_found" };
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

  const user = users.find((user) => user.status !== "DELETED" && user.roles.includes("EMPLOYEE")) ?? null;

  if (!user) {
    return { allowed: false, reason: "user_not_found" };
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
    return { allowed: false, reason: "company_inactive" };
  }

  return { allowed: true, user };
}

export async function getEmployeeUserForSession(session: EmployeeSession): Promise<DBUserItem | null> {
  const lookup = await resolveEmployeeUserForSession(session);
  return lookup.allowed ? lookup.user : null;
}

export async function requireCurrentEmployeeUser() {
  const session = await getEmployeeSession();

  // セッションが使えない（Cookie はあるがセッションが失効・破棄済み、ユーザーが削除された、所属企業が無効化された など）
  // ときは、Cookie を消してからログイン画面へ戻す。Server Component では Cookie を消せないため Route Handler に任せる。
  // Cookie を残したままログイン画面へ戻すと、middleware が Cookie を見てページへ戻し、行き来が止まらなくなる。
  if (!session) {
    redirect(buildClearEmployeeSessionRedirect() as Route);
  }

  const user = await getEmployeeUserForSession(session);

  if (!user) {
    redirect(buildClearEmployeeSessionRedirect() as Route);
  }

  return user;
}

