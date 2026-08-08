import "server-only";

import { listMerchantUsersByMerchant } from "@correcre/lib/dynamodb/merchant-user";
import { isMerchantAdminRoles, provisionMerchantUser } from "@correcre/lib/merchant-user/provision";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import type { MerchantUserItem } from "@correcre/types";

import { getMerchantCognitoConfig } from "@merchant/lib/auth/config";

import type { InviteMerchantUserInput, MerchantUserRow } from "../model/types";

type RuntimeConfig = {
  region: string;
  merchantTableName: string;
  merchantUserTableName: string;
};

function getRuntimeConfig(): RuntimeConfig {
  return {
    region: readRequiredServerEnv("AWS_REGION"),
    merchantTableName: readRequiredServerEnv("DDB_MERCHANT_TABLE_NAME"),
    merchantUserTableName: readRequiredServerEnv("DDB_MERCHANT_USER_TABLE_NAME"),
  };
}

function toMerchantUserRow(user: MerchantUserItem): MerchantUserRow {
  return {
    userId: user.userId,
    lastName: user.lastName,
    firstName: user.firstName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    status: user.status,
    isAdmin: isMerchantAdminRoles(user.roles),
    invitedAt: user.invitedAt,
    lastLoginAt: user.lastLoginAt,
  };
}

export async function listOwnMerchantUsers(merchantId: string): Promise<MerchantUserRow[]> {
  const config = getRuntimeConfig();
  const users = await listMerchantUsersByMerchant(
    {
      region: config.region,
      tableName: config.merchantUserTableName,
    },
    merchantId,
  );

  return users
    .filter((user) => user.status !== "DELETED")
    .sort((left, right) => left.userId.localeCompare(right.userId))
    .map(toMerchantUserRow);
}

// 提携企業の管理者が自社ユーザーを 1 人招待する。merchantId は必ずログイン中ユーザーの
// 所属企業を渡すこと（リクエストボディから受け取ってはならない）。
export async function inviteOwnMerchantUser(
  merchantId: string,
  input: InviteMerchantUserInput,
): Promise<MerchantUserRow> {
  const config = getRuntimeConfig();
  const cognitoConfig = getMerchantCognitoConfig();

  const created = await provisionMerchantUser(
    {
      region: config.region,
      merchantTableName: config.merchantTableName,
      merchantUserTableName: config.merchantUserTableName,
      cognitoRegion: cognitoConfig.region,
      cognitoUserPoolId: cognitoConfig.userPoolId,
    },
    {
      merchantId,
      lastName: input.lastName,
      firstName: input.firstName,
      lastNameKana: input.lastNameKana,
      firstNameKana: input.firstNameKana,
      email: input.email,
      phoneNumber: input.phoneNumber,
      isAdmin: input.isAdmin,
    },
  );

  return toMerchantUserRow(created);
}
