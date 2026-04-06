import "server-only";

import { redirect } from "next/navigation";

import { buildAwsCredentialErrorMessage, isAwsCredentialError } from "@correcre/lib/aws/credentials";
import { listUsersByCognitoSub } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import type { DBUserItem } from "@correcre/types";

import { EMPLOYEE_LOGIN_PATH } from "./constants";
import { getEmployeeSession } from "./session";
import type { EmployeeSession } from "./verify-token";

export async function getEmployeeUserForSession(session: EmployeeSession): Promise<DBUserItem | null> {
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

  return users.find((user) => user.status !== "DELETED" && user.roles.includes("EMPLOYEE")) ?? null;
}

export async function requireCurrentEmployeeUser() {
  const session = await getEmployeeSession();

  if (!session) {
    redirect(EMPLOYEE_LOGIN_PATH);
  }

  const user = await getEmployeeUserForSession(session);

  if (!user) {
    throw new Error("Employee user was not found in the DynamoDB User table.");
  }

  return user;
}

