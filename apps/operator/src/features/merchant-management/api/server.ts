import "server-only";

import { randomUUID } from "node:crypto";

import {
  createCognitoUser,
  deleteCognitoUser,
  resetCognitoUserPassword,
  updateCognitoUserEmail,
} from "@correcre/lib/cognito/user";
import {
  getMerchantById,
  listMerchants,
  putMerchant,
} from "@correcre/lib/dynamodb/merchant";
import {
  buildMerchantUserByCognitoSubGsiPk,
  buildMerchantUserByEmailGsiPk,
  buildMerchantUserSk,
  getMerchantUserByMerchantAndUserId,
  listMerchantUsersByEmail,
  listMerchantUsersByMerchant,
  putMerchantUser,
  updateMerchantUserEmail,
} from "@correcre/lib/dynamodb/merchant-user";
import {
  buildOperatorAuditLogByMerchantGsiPk,
  buildOperatorAuditLogPk,
  buildOperatorAuditLogSk,
  putOperatorAuditLog,
} from "@correcre/lib/dynamodb/operator-audit-log";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { joinNameParts } from "@correcre/lib/user-profile";
import type {
  DBUserItem,
  Merchant,
  MerchantUserItem,
  OperatorAuditEventResult,
  OperatorAuditEventType,
  OperatorAuditLogItem,
  OperatorAuditLogTarget,
} from "@correcre/types";

import { getMerchantUserPoolAdminConfig } from "@operator/lib/auth/config";
import type {
  CreateMerchantInput,
  CreateMerchantUserInput,
  MerchantApplicationDecisionInput,
  MerchantApplicationDetail,
  MerchantSummary,
  MerchantUserSummary,
  ResetMerchantUserEmailInput,
  ResetMerchantUserPasswordInput,
  UpdateMerchantInput,
} from "../model/types";

type RuntimeConfig = {
  region: string;
  merchantTableName: string;
  merchantUserTableName: string;
  operatorAuditLogTableName: string;
};

type MerchantCognitoConfig = {
  cognitoRegion: string;
  cognitoUserPoolId: string;
};

function getRuntimeConfig(): RuntimeConfig {
  return {
    region: readRequiredServerEnv("AWS_REGION"),
    merchantTableName: readRequiredServerEnv("DDB_MERCHANT_TABLE_NAME"),
    merchantUserTableName: readRequiredServerEnv("DDB_MERCHANT_USER_TABLE_NAME"),
    operatorAuditLogTableName: readRequiredServerEnv("DDB_OPERATOR_AUDIT_LOG_TABLE_NAME"),
  };
}

function getMerchantCognitoConfig(): MerchantCognitoConfig {
  const merchantPoolConfig = getMerchantUserPoolAdminConfig();
  return {
    cognitoRegion: merchantPoolConfig.region,
    cognitoUserPoolId: merchantPoolConfig.userPoolId,
  };
}

async function recordOperatorAuditLog(
  config: RuntimeConfig,
  params: {
    eventType: OperatorAuditEventType;
    result: OperatorAuditEventResult;
    actor: DBUserItem;
    target: OperatorAuditLogTarget;
    errorMessage?: string;
  },
): Promise<void> {
  const occurredAt = new Date().toISOString();
  const eventId = randomUUID();

  const item: OperatorAuditLogItem = {
    pk: buildOperatorAuditLogPk(params.actor.userId),
    sk: buildOperatorAuditLogSk(occurredAt, eventId),
    eventId,
    eventType: params.eventType,
    occurredAt,
    result: params.result,
    actor: {
      userId: params.actor.userId,
      email: params.actor.email,
      cognitoSub: params.actor.cognitoSub,
      displayName: joinNameParts(params.actor.lastName, params.actor.firstName),
    },
    target: params.target,
    errorMessage: params.errorMessage,
    gsi1pk: buildOperatorAuditLogByMerchantGsiPk(params.target.merchantId),
    gsi1sk: buildOperatorAuditLogSk(occurredAt, eventId),
  };

  try {
    await putOperatorAuditLog(
      {
        region: config.region,
        tableName: config.operatorAuditLogTableName,
      },
      item,
    );
  } catch (error) {
    console.error("Failed to write operator audit log", error, item);
  }
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

  const exchangeFeePercent = input.exchangeFeePercent;
  if (exchangeFeePercent !== undefined) {
    if (
      typeof exchangeFeePercent !== "number" ||
      !Number.isFinite(exchangeFeePercent) ||
      exchangeFeePercent < 0 ||
      exchangeFeePercent > 100
    ) {
      throw new Error("交換手数料は 0〜100 の数値（%）で入力してください");
    }
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
    exchangeFeePercent,
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

export async function listPendingMerchantApplicationsForOperator(): Promise<MerchantApplicationDetail[]> {
  const config = getRuntimeConfig();
  const merchants = await listMerchants({
    region: config.region,
    tableName: config.merchantTableName,
  });

  const pendingMerchants = merchants
    .filter((merchant) => merchant.status === "PENDING")
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) * -1);

  const applications = await Promise.all(
    pendingMerchants.map(async (merchant): Promise<MerchantApplicationDetail> => {
      const users = await listMerchantUsersByMerchant(
        {
          region: config.region,
          tableName: config.merchantUserTableName,
        },
        merchant.merchantId,
      );

      const contactUser = users.find((user) => user.status === "PENDING") ?? null;

      return {
        merchant,
        contactUser: contactUser
          ? {
              userId: contactUser.userId,
              lastName: contactUser.lastName,
              firstName: contactUser.firstName,
              lastNameKana: contactUser.lastNameKana,
              firstNameKana: contactUser.firstNameKana,
              email: contactUser.email,
              phoneNumber: contactUser.phoneNumber,
              status: contactUser.status,
            }
          : null,
      };
    }),
  );

  return applications;
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
    exchangeFeePercent: normalized.exchangeFeePercent,
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
    exchangeFeePercent: normalized.exchangeFeePercent,
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
  const cognitoConfig = getMerchantCognitoConfig();
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
        region: cognitoConfig.cognitoRegion,
        userPoolId: cognitoConfig.cognitoUserPoolId,
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
            region: cognitoConfig.cognitoRegion,
            userPoolId: cognitoConfig.cognitoUserPoolId,
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

export async function resetMerchantUserEmailForOperator(
  input: ResetMerchantUserEmailInput,
  operator: DBUserItem,
): Promise<MerchantUserSummary> {
  const config = getRuntimeConfig();
  const cognitoConfig = getMerchantCognitoConfig();
  const newEmail = input.newEmail.trim().toLowerCase();

  if (!newEmail) {
    throw new Error("新しいメールアドレスを入力してください");
  }

  if (!isValidEmail(newEmail)) {
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

  const user = await getMerchantUserByMerchantAndUserId(
    {
      region: config.region,
      tableName: config.merchantUserTableName,
    },
    input.merchantId,
    input.userId,
  );

  if (!user || user.status === "DELETED") {
    throw new Error("対象のユーザーが見つかりません");
  }

  if (user.email === newEmail) {
    throw new Error("現在のメールアドレスと同じです");
  }

  const existingByEmail = await listMerchantUsersByEmail(
    {
      region: config.region,
      tableName: config.merchantUserTableName,
    },
    newEmail,
  );

  const conflict = existingByEmail.find(
    (other) =>
      other.status !== "DELETED" &&
      !(other.merchantId === user.merchantId && other.userId === user.userId),
  );

  if (conflict) {
    throw new Error("同じメールアドレスのユーザーがすでに登録されています");
  }

  const beforeEmail = user.email;
  const auditTarget: OperatorAuditLogTarget = {
    merchantId: merchant.merchantId,
    merchantName: merchant.name,
    merchantUserId: user.userId,
    merchantUserName: joinNameParts(user.lastName, user.firstName),
    beforeEmail,
    afterEmail: newEmail,
  };

  const updatedUser = await updateMerchantUserEmail(
    {
      region: config.region,
      tableName: config.merchantUserTableName,
    },
    input.merchantId,
    input.userId,
    newEmail,
  );

  if (!updatedUser) {
    throw new Error("対象のユーザーが見つかりません");
  }

  let cognitoEmailUpdated = false;
  let merchantContactEmailUpdated = false;
  const beforeMerchantContactEmail = merchant.contactEmail;

  try {
    await putMerchant(
      {
        region: config.region,
        tableName: config.merchantTableName,
      },
      {
        ...merchant,
        contactEmail: newEmail,
        updatedAt: new Date().toISOString(),
      },
    );
    merchantContactEmailUpdated = true;

    await updateCognitoUserEmail(
      {
        region: cognitoConfig.cognitoRegion,
        userPoolId: cognitoConfig.cognitoUserPoolId,
      },
      {
        username: user.cognitoSub ?? user.email,
        newEmail,
      },
    );
    cognitoEmailUpdated = true;
    await resetCognitoUserPassword(
      {
        region: cognitoConfig.cognitoRegion,
        userPoolId: cognitoConfig.cognitoUserPoolId,
      },
      {
        username: user.cognitoSub ?? user.email,
      },
    );
  } catch (error) {
    if (merchantContactEmailUpdated) {
      try {
        await putMerchant(
          {
            region: config.region,
            tableName: config.merchantTableName,
          },
          {
            ...merchant,
            contactEmail: beforeMerchantContactEmail,
            updatedAt: new Date().toISOString(),
          },
        );
      } catch (rollbackMerchantError) {
        console.error("Failed to roll back merchant contact email after reset failure", rollbackMerchantError);
      }
    }

    if (cognitoEmailUpdated) {
      try {
        await updateCognitoUserEmail(
          {
            region: cognitoConfig.cognitoRegion,
            userPoolId: cognitoConfig.cognitoUserPoolId,
          },
          {
            username: user.cognitoSub ?? user.email,
            newEmail: beforeEmail,
          },
        );
      } catch (rollbackCognitoError) {
        console.error("Failed to roll back Cognito email after password reset notification failure", rollbackCognitoError);
      }
    }

    try {
      await updateMerchantUserEmail(
        {
          region: config.region,
          tableName: config.merchantUserTableName,
        },
        input.merchantId,
        input.userId,
        beforeEmail,
      );
    } catch (rollbackError) {
      console.error("Failed to roll back MerchantUser email after Cognito update failure", rollbackError);
      await recordOperatorAuditLog(config, {
        eventType: "MERCHANT_USER_EMAIL_RESET",
        result: "FAILURE",
        actor: operator,
        target: auditTarget,
        errorMessage:
          error instanceof Error
            ? `Cognito 更新失敗 + DB ロールバック失敗: ${error.message}`
            : "Cognito 更新失敗 + DB ロールバック失敗",
      });
      throw new Error("Cognito 更新失敗後の DB ロールバックに失敗しました。手動確認が必要です。");
    }

    await recordOperatorAuditLog(config, {
      eventType: "MERCHANT_USER_EMAIL_RESET",
      result: "ROLLED_BACK",
      actor: operator,
      target: auditTarget,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof Error && (error.name === "AliasExistsException" || error.name === "UsernameExistsException")) {
      throw new Error("同じメールアドレスの Cognito ユーザーが既に存在します");
    }

    throw new Error("Cognito のメールアドレス更新に失敗したため変更を元に戻しました。");
  }

  await recordOperatorAuditLog(config, {
    eventType: "MERCHANT_USER_EMAIL_RESET",
    result: "SUCCESS",
    actor: operator,
    target: auditTarget,
  });

  return toMerchantUserSummary(updatedUser);
}

export async function resetMerchantUserPasswordForOperator(
  input: ResetMerchantUserPasswordInput,
  operator: DBUserItem,
): Promise<MerchantUserSummary> {
  const config = getRuntimeConfig();
  const cognitoConfig = getMerchantCognitoConfig();

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

  const user = await getMerchantUserByMerchantAndUserId(
    {
      region: config.region,
      tableName: config.merchantUserTableName,
    },
    input.merchantId,
    input.userId,
  );

  if (!user || user.status === "DELETED") {
    throw new Error("対象のユーザーが見つかりません");
  }

  const auditTarget: OperatorAuditLogTarget = {
    merchantId: merchant.merchantId,
    merchantName: merchant.name,
    merchantUserId: user.userId,
    merchantUserName: joinNameParts(user.lastName, user.firstName),
    beforeEmail: user.email,
    afterEmail: user.email,
  };

  try {
    await resetCognitoUserPassword(
      {
        region: cognitoConfig.cognitoRegion,
        userPoolId: cognitoConfig.cognitoUserPoolId,
      },
      { username: user.cognitoSub ?? user.email },
    );
  } catch (error) {
    await recordOperatorAuditLog(config, {
      eventType: "MERCHANT_USER_PASSWORD_RESET",
      result: "FAILURE",
      actor: operator,
      target: auditTarget,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    throw new Error("Cognito のパスワードリセットに失敗しました。");
  }

  await recordOperatorAuditLog(config, {
    eventType: "MERCHANT_USER_PASSWORD_RESET",
    result: "SUCCESS",
    actor: operator,
    target: auditTarget,
  });

  return toMerchantUserSummary(user);
}

export async function getMerchantApplicationDetail(merchantId: string): Promise<MerchantApplicationDetail | null> {
  const config = getRuntimeConfig();

  const merchant = await getMerchantById(
    {
      region: config.region,
      tableName: config.merchantTableName,
    },
    merchantId,
  );

  if (!merchant) {
    return null;
  }

  const users = await listMerchantUsersByMerchant(
    {
      region: config.region,
      tableName: config.merchantUserTableName,
    },
    merchantId,
  );

  const contactUser = users.find((user) => user.status !== "DELETED") ?? null;

  return {
    merchant,
    contactUser: contactUser
      ? {
          userId: contactUser.userId,
          lastName: contactUser.lastName,
          firstName: contactUser.firstName,
          lastNameKana: contactUser.lastNameKana,
          firstNameKana: contactUser.firstNameKana,
          email: contactUser.email,
          phoneNumber: contactUser.phoneNumber,
          status: contactUser.status,
        }
      : null,
  };
}

export async function approveMerchantApplicationForOperator(
  input: MerchantApplicationDecisionInput,
  operator: DBUserItem,
): Promise<MerchantSummary> {
  const config = getRuntimeConfig();
  const cognitoConfig = getMerchantCognitoConfig();

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

  if (merchant.status !== "PENDING") {
    throw new Error("申請ステータスが PENDING ではないため承認できません");
  }

  const users = await listMerchantUsersByMerchant(
    {
      region: config.region,
      tableName: config.merchantUserTableName,
    },
    input.merchantId,
  );

  const pendingUser = users.find((user) => user.status === "PENDING");

  if (!pendingUser) {
    throw new Error("申請に紐づく担当者ユーザーが見つかりません");
  }

  const auditTarget: OperatorAuditLogTarget = {
    merchantId: merchant.merchantId,
    merchantName: merchant.name,
    merchantUserId: pendingUser.userId,
    merchantUserName: joinNameParts(pendingUser.lastName, pendingUser.firstName),
    beforeEmail: pendingUser.email,
    afterEmail: pendingUser.email,
  };

  let createdCognitoUser: { cognitoSub: string; username: string } | null = null;

  try {
    createdCognitoUser = await createCognitoUser(
      {
        region: cognitoConfig.cognitoRegion,
        userPoolId: cognitoConfig.cognitoUserPoolId,
      },
      {
        email: pendingUser.email,
        firstName: pendingUser.firstName,
        lastName: pendingUser.lastName,
        fullName: joinNameParts(pendingUser.lastName, pendingUser.firstName),
        roles: ["MERCHANT"],
      },
    );
  } catch (error) {
    await recordOperatorAuditLog(config, {
      eventType: "MERCHANT_REGISTRATION_APPROVED",
      result: "FAILURE",
      actor: operator,
      target: auditTarget,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof Error && (error.name === "UsernameExistsException" || error.name === "AliasExistsException")) {
      throw new Error("同じメールアドレスの Cognito ユーザーが既に存在します");
    }

    throw error;
  }

  const now = new Date().toISOString();

  const activatedMerchant: Merchant = {
    ...merchant,
    status: "ACTIVE",
    updatedAt: now,
  };

  const invitedUser: MerchantUserItem = {
    ...pendingUser,
    cognitoSub: createdCognitoUser.cognitoSub,
    status: "INVITED",
    invitedAt: now,
    updatedAt: now,
    gsi1pk: buildMerchantUserByCognitoSubGsiPk(createdCognitoUser.cognitoSub),
  };

  try {
    await putMerchant(
      {
        region: config.region,
        tableName: config.merchantTableName,
      },
      activatedMerchant,
    );

    await putMerchantUser(
      {
        region: config.region,
        tableName: config.merchantUserTableName,
      },
      invitedUser,
    );
  } catch (error) {
    try {
      await deleteCognitoUser(
        {
          region: cognitoConfig.cognitoRegion,
          userPoolId: cognitoConfig.cognitoUserPoolId,
        },
        createdCognitoUser.username,
      );
    } catch (rollbackError) {
      console.error("Failed to roll back Cognito user after approval DB failure", rollbackError);
      await recordOperatorAuditLog(config, {
        eventType: "MERCHANT_REGISTRATION_APPROVED",
        result: "FAILURE",
        actor: operator,
        target: auditTarget,
        errorMessage:
          error instanceof Error
            ? `DB 更新失敗 + Cognito ロールバック失敗: ${error.message}`
            : "DB 更新失敗 + Cognito ロールバック失敗",
      });
      throw new Error("承認処理の DB 更新失敗後の Cognito ロールバックに失敗しました。手動確認が必要です。");
    }

    await recordOperatorAuditLog(config, {
      eventType: "MERCHANT_REGISTRATION_APPROVED",
      result: "ROLLED_BACK",
      actor: operator,
      target: auditTarget,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    throw new Error("DB の更新に失敗したため Cognito ユーザーをロールバックしました。再度お試しください。");
  }

  await recordOperatorAuditLog(config, {
    eventType: "MERCHANT_REGISTRATION_APPROVED",
    result: "SUCCESS",
    actor: operator,
    target: auditTarget,
  });

  return activatedMerchant;
}

export async function rejectMerchantApplicationForOperator(
  input: MerchantApplicationDecisionInput,
  operator: DBUserItem,
): Promise<MerchantSummary> {
  const config = getRuntimeConfig();

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

  if (merchant.status !== "PENDING") {
    throw new Error("申請ステータスが PENDING ではないため却下できません");
  }

  const users = await listMerchantUsersByMerchant(
    {
      region: config.region,
      tableName: config.merchantUserTableName,
    },
    input.merchantId,
  );

  const pendingUser = users.find((user) => user.status === "PENDING") ?? null;

  const auditTarget: OperatorAuditLogTarget = {
    merchantId: merchant.merchantId,
    merchantName: merchant.name,
    merchantUserId: pendingUser?.userId ?? "",
    merchantUserName: pendingUser ? joinNameParts(pendingUser.lastName, pendingUser.firstName) : undefined,
    beforeEmail: pendingUser?.email,
    afterEmail: pendingUser?.email,
  };

  const now = new Date().toISOString();

  const rejectedMerchant: Merchant = {
    ...merchant,
    status: "REJECTED",
    updatedAt: now,
  };

  await putMerchant(
    {
      region: config.region,
      tableName: config.merchantTableName,
    },
    rejectedMerchant,
  );

  if (pendingUser) {
    const deletedUser: MerchantUserItem = {
      ...pendingUser,
      status: "DELETED",
      updatedAt: now,
    };

    await putMerchantUser(
      {
        region: config.region,
        tableName: config.merchantUserTableName,
      },
      deletedUser,
    );
  }

  await recordOperatorAuditLog(config, {
    eventType: "MERCHANT_REGISTRATION_REJECTED",
    result: "SUCCESS",
    actor: operator,
    target: auditTarget,
  });

  return rejectedMerchant;
}
