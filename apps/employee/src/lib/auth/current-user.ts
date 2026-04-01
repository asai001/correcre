import "server-only";

import { redirect } from "next/navigation";

import { buildAwsCredentialErrorMessage, isAwsCredentialError } from "@correcre/lib/aws/credentials";
import { getUserByCognitoSub } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";

import { EMPLOYEE_LOGIN_PATH } from "./constants";
import { getEmployeeSession } from "./session";

export async function requireCurrentEmployeeUser() {
  const session = await getEmployeeSession();

  if (!session) {
    redirect(EMPLOYEE_LOGIN_PATH);
  }

  const cognitoSub = session.payload.sub?.trim();

  if (!cognitoSub) {
    throw new Error("Employee session does not include a Cognito sub.");
  }

  let user;

  try {
    user = await getUserByCognitoSub(
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

  if (!user || user.status === "DELETED") {
    throw new Error("Employee user was not found in the DynamoDB User table.");
  }

  return user;
}

