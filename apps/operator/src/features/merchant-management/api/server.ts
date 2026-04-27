import "server-only";

import { createCognitoUser, deleteCognitoUser } from "@correcre/lib/cognito/user";
import {
  getMerchantById,
  listMerchants,
  putMerchant,
} from "@correcre/lib/dynamodb/merchant";
import {
  buildMerchantUserByCognitoSubGsiPk,
  buildMerchantUserByEmailGsiPk,
  buildMerchantUserSk,
  listMerchantUsersByEmail,
  listMerchantUsersByMerchant,
  putMerchantUser,
} from "@correcre/lib/dynamodb/merchant-user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { joinNameParts } from "@correcre/lib/user-profile";
import type { Merchant, MerchantUserItem } from "@correcre/types";

import { getOperatorCognitoConfig } from "@operator/lib/auth/config";
import type {
  CreateMerchantInput,
  CreateMerchantUserInput,
  MerchantSummary,
  MerchantUserSummary,
  UpdateMerchantInput,
} from "../model/types";

type RuntimeConfig = {
  region: string;
  merchantTableName: string;
  merchantUserTableName: string;
  cognitoRegion: string;
  cognitoUserPoolId: string;
};

function getRuntimeConfig(): RuntimeConfig {
  const cognitoConfig = getOperatorCognitoConfig();

  return {
    region: readRequiredServerEnv("AWS_REGION"),
    merchantTableName: readRequiredServerEnv("DDB_MERCHANT_TABLE_NAME"),
    merchantUserTableName: readRequiredServerEnv("DDB_MERCHANT_USER_TABLE_NAME"),
    cognitoRegion: cognitoConfig.region,
    cognitoUserPoolId: cognitoConfig.userPoolId,
  };
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getNextMerchantId(merchants: Merchant[]) {
  const nextNumber =
    merchants.reduce((max, merchant) => {
      const match = /^m-(\d+)$/.exec(merchant.merchantId);
      if (!match) {
        return max;
      }

      return Math.max(max, Number(match[1]));
    }, 0) + 1;

  return `m-${String(nextNumber).padStart(3, "0")}`;
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

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeMerchantInput(input: CreateMerchantInput) {
  const name = input.name.trim();
  const companyLocation = input.companyLocation.trim();
  const customerInquiryContact = input.customerInquiryContact.trim();
  const contactPersonName = input.contactPersonName.trim();
  const contactPersonPhone = input.contactPersonPhone.trim();

  if (
    !name ||
    !companyLocation ||
    !customerInquiryContact ||
    !contactPersonName ||
    !contactPersonPhone ||
    !input.storeAddressMode
  ) {
    throw new Error("提携企業の必須項目を入力してください");
  }

  if (input.storeAddressMode === "other" && !input.storeAddressOther?.trim()) {
    throw new Error("店舗住所（その他）を入力してください");
  }

  const contactEmail = normalizeOptionalText(input.contactEmail);
  if (contactEmail && !isValidEmail(contactEmail)) {
    throw new Error("メールアドレスの形式が正しくありません");
  }

  return {
    name,
    kanaName: normalizeOptionalText(input.kanaName),
    companyLocation,
    storeAddressMode: input.storeAddressMode,
    storeAddressOther: normalizeOptionalText(input.storeAddressOther),
    customerInquiryContact,
    contactPersonName,
    contactPersonPhone,
    contactEmail,
    bankTransferAccount: normalizeOptionalText(input.bankTransferAccount),
    paymentCycle: normalizeOptionalText(input.paymentCycle),
  };
}

function toMerchantUserSummary(user: MerchantUserItem): MerchantUserSummary {
  return {
    merchantId: user.merchantId,
    userId: user.userId,
    lastName: user.lastName,
    firstName: user.firstName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    status: user.status,
    invitedAt: user.invitedAt,
    joinedAt: user.joinedAt,
    lastLoginAt: user.lastLoginAt,
  };
}

export async function listMerchantsForOperator(): Promise<MerchantSummary[]> {
  const config = getRuntimeConfig();
  const merchants = await listMerchants({
    region: config.region,
    tableName: config.merchantTableName,
  });

  return merchants.sort((left, right) => left.createdAt.localeCompare(right.createdAt) * -1);
}

export async function createMerchantForOperator(input: CreateMerchantInput): Promise<MerchantSummary> {
  const config = getRuntimeConfig();
  const normalized = normalizeMerchantInput(input);
  const merchants = await listMerchants({
    region: config.region,
    tableName: config.merchantTableName,
  });

  const merchantId = getNextMerchantId(merchants);
  const now = new Date().toISOString();

  const merchant: Merchant = {
    merchantId,
    name: normalized.name,
    kanaName: normalized.kanaName,
    status: input.status ?? "ACTIVE",
    companyLocation: normalized.companyLocation,
    storeAddressMode: normalized.storeAddressMode,
    storeAddressOther: normalized.storeAddressOther,
    customerInquiryContact: normalized.customerInquiryContact,
    contactPersonName: normalized.contactPersonName,
    contactPersonPhone: normalized.contactPersonPhone,
    contactEmail: normalized.contactEmail,
    bankTransferAccount: normalized.bankTransferAccount,
    paymentCycle: normalized.paymentCycle,
    createdAt: now,
    updatedAt: now,
  };

  await putMerchant(
    {
      region: config.region,
      tableName: config.merchantTableName,
    },
    merchant,
  );

  return merchant;
}

export async function updateMerchantForOperator(input: UpdateMerchantInput): Promise<MerchantSummary> {
  const config = getRuntimeConfig();
  const existing = await getMerchantById(
    {
      region: config.region,
      tableName: config.merchantTableName,
    },
    input.merchantId,
  );

  if (!existing) {
    throw new Error("Merchant not found");
  }

  const normalized = normalizeMerchantInput(input);
  const now = new Date().toISOString();

  const merchant: Merchant = {
    ...existing,
    name: normalized.name,
    kanaName: normalized.kanaName,
    status: input.status ?? existing.status,
    companyLocation: normalized.companyLocation,
    storeAddressMode: normalized.storeAddressMode,
    storeAddressOther: normalized.storeAddressOther,
    customerInquiryContact: normalized.customerInquiryContact,
    contactPersonName: normalized.contactPersonName,
    contactPersonPhone: normalized.contactPersonPhone,
    contactEmail: normalized.contactEmail,
    bankTransferAccount: normalized.bankTransferAccount,
    paymentCycle: normalized.paymentCycle,
    updatedAt: now,
  };

  await putMerchant(
    {
      region: config.region,
      tableName: config.merchantTableName,
    },
    merchant,
  );

  return merchant;
}

export async function listMerchantUsersForOperator(merchantId: string): Promise<MerchantUserSummary[]> {
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
    .map(toMerchantUserSummary);
}

export async function createMerchantUserForOperator(
  input: CreateMerchantUserInput,
): Promise<MerchantUserSummary> {
  const config = getRuntimeConfig();
  const lastName = input.lastName.trim();
  const firstName = input.firstName.trim();
  const email = input.email.trim().toLowerCase();
  const phoneNumber = normalizeOptionalText(input.phoneNumber);
  const lastNameKana = normalizeOptionalText(input.lastNameKana);
  const firstNameKana = normalizeOptionalText(input.firstNameKana);

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
        roles: ["MERCHANT"],
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
      roles: ["MERCHANT"],
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
    );

    return toMerchantUserSummary(merchantUser);
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
