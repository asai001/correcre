import "server-only";

import type { MerchantUserItem, MerchantUserRole } from "@correcre/types";

import { createCognitoUser, deleteCognitoUser } from "../cognito/user";
import { getMerchantById } from "../dynamodb/merchant";
import {
  buildMerchantUserByCognitoSubGsiPk,
  buildMerchantUserByEmailGsiPk,
  buildMerchantUserSk,
  listMerchantUsersByEmail,
  listMerchantUsersByMerchant,
  putMerchantUser,
} from "../dynamodb/merchant-user";
import { joinNameParts } from "../user-profile";

export type ProvisionMerchantUserConfig = {
  region: string;
  merchantTableName: string;
  merchantUserTableName: string;
  cognitoRegion: string;
  cognitoUserPoolId: string;
};

export type ProvisionMerchantUserInput = {
  merchantId: string;
  lastName: string;
  firstName: string;
  lastNameKana?: string;
  firstNameKana?: string;
  email: string;
  phoneNumber?: string;
  // true の場合、自社ユーザーを追加できる管理者として招待する。
  isAdmin?: boolean;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function getNextMerchantUserId(users: MerchantUserItem[]) {
  const nextNumber =
    users.reduce((max, user) => {
      const match = /^mu-(\d+)$/.exec(user.userId);
      if (!match) {
        return max;
      }

      return Math.max(max, Number(match[1]));
    }, 0) + 1;

  return `mu-${String(nextNumber).padStart(3, "0")}`;
}

export function buildMerchantUserRoles(isAdmin: boolean): MerchantUserRole[] {
  // MERCHANT_ADMIN は MERCHANT を包含する（ログイン判定は MERCHANT を見るため必ず併せ持つ）。
  return isAdmin ? ["MERCHANT", "MERCHANT_ADMIN"] : ["MERCHANT"];
}

export function isMerchantAdminRoles(roles: readonly MerchantUserRole[]): boolean {
  return roles.includes("MERCHANT_ADMIN");
}

// 提携企業ユーザーを 1 人招待する（Cognito ユーザー作成 + MerchantUser レコード登録）。
// 運用者アプリと提携企業アプリの双方から利用する共通処理。
// DB 登録に失敗した場合は作成済み Cognito ユーザーをロールバックする。
export async function provisionMerchantUser(
  config: ProvisionMerchantUserConfig,
  input: ProvisionMerchantUserInput,
): Promise<MerchantUserItem> {
  const lastName = input.lastName.trim();
  const firstName = input.firstName.trim();
  const email = input.email.trim().toLowerCase();
  const phoneNumber = normalizeOptionalText(input.phoneNumber);
  const lastNameKana = normalizeOptionalText(input.lastNameKana);
  const firstNameKana = normalizeOptionalText(input.firstNameKana);
  const roles = buildMerchantUserRoles(input.isAdmin ?? false);

  if (!lastName || !firstName || !email) {
    throw new Error("姓名とメールアドレスを入力してください");
  }

  if (!isValidEmail(email)) {
    throw new Error("メールアドレスの形式が正しくありません");
  }

  const merchant = await getMerchantById(
    {
      region: config.region,
      tableName: config.merchantTableName,
    },
    input.merchantId,
  );

  if (!merchant) {
    throw new Error("Merchant not found");
  }

  const existingByEmail = await listMerchantUsersByEmail(
    {
      region: config.region,
      tableName: config.merchantUserTableName,
    },
    email,
  );

  if (existingByEmail.some((user) => user.status !== "DELETED")) {
    throw new Error("同じメールアドレスのユーザーがすでに登録されています");
  }

  const existingUsers = await listMerchantUsersByMerchant(
    {
      region: config.region,
      tableName: config.merchantUserTableName,
    },
    input.merchantId,
  );

  const userId = getNextMerchantUserId(existingUsers);
  const now = new Date().toISOString();

  let createdCognitoUser: { cognitoSub: string; username: string } | null = null;

  try {
    createdCognitoUser = await createCognitoUser(
      {
        region: config.cognitoRegion,
        userPoolId: config.cognitoUserPoolId,
      },
      {
        email,
        firstName,
        lastName,
        fullName: joinNameParts(lastName, firstName),
        roles,
      },
    );

    const merchantUser: MerchantUserItem = {
      merchantId: input.merchantId,
      sk: buildMerchantUserSk(userId),
      userId,
      cognitoSub: createdCognitoUser.cognitoSub,
      lastName,
      firstName,
      lastNameKana,
      firstNameKana,
      email,
      phoneNumber,
      roles,
      status: "INVITED",
      invitedAt: now,
      createdAt: now,
      updatedAt: now,
      gsi1pk: buildMerchantUserByCognitoSubGsiPk(createdCognitoUser.cognitoSub),
      gsi2pk: buildMerchantUserByEmailGsiPk(email),
    };

    await putMerchantUser(
      {
        region: config.region,
        tableName: config.merchantUserTableName,
      },
      merchantUser,
      { conditionExpression: "attribute_not_exists(sk)" },
    );

    return merchantUser;
  } catch (error) {
    if (createdCognitoUser) {
      try {
        await deleteCognitoUser(
          {
            region: config.cognitoRegion,
            userPoolId: config.cognitoUserPoolId,
          },
          createdCognitoUser.username,
        );
      } catch (rollbackError) {
        console.error("Failed to roll back Cognito user after MerchantUser put failure", rollbackError);
        throw new Error("Cognito ユーザー作成後のロールバックに失敗しました。手動確認が必要です。");
      }

      throw new Error(
        "DB へのユーザー登録に失敗したため Cognito ユーザー登録のロールバックを行いました。再度登録してください。",
      );
    }

    if (error instanceof Error && (error.name === "UsernameExistsException" || error.name === "AliasExistsException")) {
      throw new Error("同じメールアドレスの Cognito ユーザーが既に存在します");
    }

    throw error;
  }
}
