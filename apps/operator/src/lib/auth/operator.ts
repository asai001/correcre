import "server-only";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { buildAwsCredentialErrorMessage, isAwsCredentialError } from "@correcre/lib/aws/credentials";
import { listUsersByCognitoSub } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import type { DBUserItem } from "@correcre/types";

import { buildClearOperatorSessionRedirect } from "./redirect";
import { getOperatorSession } from "./session";
import type { OperatorSession } from "./verify-token";

type OperatorAccessStatus =
  | {
      allowed: true;
      session: OperatorSession;
      user: DBUserItem;
    }
  | {
      allowed: false;
      reason: "unauthenticated" | "forbidden";
    };

export async function getOperatorUserForSession(session: OperatorSession): Promise<DBUserItem | null> {
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

  return users.find((user) => user.status !== "DELETED" && user.roles.includes("OPERATOR")) ?? null;
}

export async function getOperatorAccessStatus(): Promise<OperatorAccessStatus> {
  const session = await getOperatorSession();

  if (!session) {
    return { allowed: false, reason: "unauthenticated" };
  }

  const user = await getOperatorUserForSession(session);

  if (!user) {
    return { allowed: false, reason: "forbidden" };
  }

  return {
    allowed: true,
    session,
    user,
  };
}

export async function requireOperatorSession() {
  const access = await getOperatorAccessStatus();

  if (!access.allowed) {
    redirect(buildClearOperatorSessionRedirect() as Route);
  }

  return access.session;
}

export async function requireCurrentOperatorUser() {
  const access = await getOperatorAccessStatus();

  if (!access.allowed) {
    redirect(buildClearOperatorSessionRedirect() as Route);
  }

  return access.user;
}
