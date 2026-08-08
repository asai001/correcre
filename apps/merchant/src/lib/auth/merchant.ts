import "server-only";

import { cache } from "react";

import { redirect } from "next/navigation";

import { buildAwsCredentialErrorMessage, isAwsCredentialError } from "@correcre/lib/aws/credentials";
import { getMerchantById } from "@correcre/lib/dynamodb/merchant";
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

export async function getMerchantDisplayName(merchantId: string): Promise<string> {
  const merchant = await getMerchantById(
    {
      region: readRequiredServerEnv("AWS_REGION"),
      tableName: readRequiredServerEnv("DDB_MERCHANT_TABLE_NAME"),
    },
    merchantId,
  );

  return merchant?.displayName?.trim() || merchant?.name?.trim() || "";
}

export async function getMerchantHeaderInfo(merchantId: string): Promise<{
  displayName: string;
  contactPersonName: string;
}> {
  const merchant = await getMerchantById(
    {
      region: readRequiredServerEnv("AWS_REGION"),
      tableName: readRequiredServerEnv("DDB_MERCHANT_TABLE_NAME"),
    },
    merchantId,
  );

  return {
    displayName: merchant?.displayName?.trim() || merchant?.name?.trim() || "",
    contactPersonName: merchant?.contactPersonName?.trim() || "",
  };
}

// レイアウト（ナビ表示判定）とページの双方から呼ばれるため、
// 同一リクエスト内では React cache でセッション検証と DB 参照を 1 回にまとめる。
export const getMerchantAccessStatus = cache(async (): Promise<MerchantAccessStatus> => {
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
});

export function isMerchantAdminUser(user: MerchantUserItem): boolean {
  return user.roles.includes("MERCHANT_ADMIN");
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

// 管理者ロール（MERCHANT_ADMIN）を持つユーザーのみ許可する。
// 未ログインはログイン画面へ、一般ユーザーはダッシュボードへ戻す。
export async function requireCurrentMerchantAdminUser() {
  const user = await requireCurrentMerchantUser();

  if (!isMerchantAdminUser(user)) {
    redirect("/dashboard");
  }

  return user;
}
