import "server-only";

import { redirect } from "next/navigation";

import { buildAwsCredentialErrorMessage, isAwsCredentialError } from "@correcre/lib/aws/credentials";
import { listMerchantUsersByCognitoSub } from "@correcre/lib/dynamodb/merchant-user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import type { MerchantUserItem } from "@correcre/types";

import { MERCHANT_LOGIN_PATH } from "./constants";
import { clearMerchantSession, getMerchantSession } from "./session";
import type { MerchantSession } from "./verify-token";

type MerchantAccessStatus =
  | {
      allowed: true;
      session: MerchantSession;
      user: MerchantUserItem;
    }
  | {
      allowed: false;
      reason: "unauthenticated" | "forbidden";
    };

export async function getMerchantUserForSession(session: MerchantSession): Promise<MerchantUserItem | null> {
  const cognitoSub = session.payload.sub?.trim();

  if (!cognitoSub) {
    return null;
  }

  let users: MerchantUserItem[];

  try {
    users = await listMerchantUsersByCognitoSub(
      {
        region: readRequiredServerEnv("AWS_REGION"),
        tableName: readRequiredServerEnv("DDB_MERCHANT_USER_TABLE_NAME"),
      },
      cognitoSub,
    );
  } catch (error) {
    if (isAwsCredentialError(error)) {
      throw new Error(buildAwsCredentialErrorMessage(), { cause: error });
    }

    throw error;
  }

  return users.find((user) => user.status !== "DELETED" && user.roles.includes("MERCHANT")) ?? null;
}

export async function getMerchantAccessStatus(): Promise<MerchantAccessStatus> {
  const session = await getMerchantSession();

  if (!session) {
    return { allowed: false, reason: "unauthenticated" };
  }

  const user = await getMerchantUserForSession(session);

  if (!user) {
    return { allowed: false, reason: "forbidden" };
  }

  return {
    allowed: true,
    session,
    user,
  };
}

export async function requireMerchantSession() {
  const access = await getMerchantAccessStatus();

  if (!access.allowed) {
    await clearMerchantSession();
    redirect(MERCHANT_LOGIN_PATH);
  }

  return access.session;
}

export async function requireCurrentMerchantUser() {
  const access = await getMerchantAccessStatus();

  if (!access.allowed) {
    await clearMerchantSession();
    redirect(MERCHANT_LOGIN_PATH);
  }

  return access.user;
}
