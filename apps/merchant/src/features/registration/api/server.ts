import "server-only";

import { listMerchants, putMerchant } from "@correcre/lib/dynamodb/merchant";
import {
  buildMerchantUserByEmailGsiPk,
  buildMerchantUserSk,
  listMerchantUsersByEmail,
  putMerchantUser,
} from "@correcre/lib/dynamodb/merchant-user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import {
  sendMerchantRegistrationAcceptedEmail,
  sendOperatorMerchantRegistrationSubmittedEmail,
} from "@correcre/lib/notification/merchant-events";
import type { Merchant, MerchantUserItem } from "@correcre/types";

import type {
  SubmitMerchantRegistrationInput,
  SubmitMerchantRegistrationResult,
} from "../model/types";

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

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isConditionalCheckFailure(error: unknown): boolean {
  return (
    Boolean(error) && typeof error === "object" && (error as { name?: string }).name === "ConditionalCheckFailedException"
  );
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

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

async function notifyMerchantRegistrationSubmitted(params: {
  config: RuntimeConfig;
  merchant: Merchant;
  merchantUser: MerchantUserItem;
  submittedAt: string;
}) {
  const results = await Promise.allSettled([
    sendMerchantRegistrationAcceptedEmail({
      region: params.config.region,
      merchant: params.merchant,
      merchantUser: params.merchantUser,
      submittedAt: params.submittedAt,
    }),
    sendOperatorMerchantRegistrationSubmittedEmail({
      region: params.config.region,
      merchant: params.merchant,
      merchantUser: params.merchantUser,
      submittedAt: params.submittedAt,
    }),
  ]);

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error("Failed to send merchant registration notification.", {
        target: index === 0 ? "registrant" : "operator",
        merchantId: params.merchant.merchantId,
        error: result.reason,
      });
    }
  });
}

export async function submitMerchantRegistration(
  input: SubmitMerchantRegistrationInput,
): Promise<SubmitMerchantRegistrationResult> {
  const config = getRuntimeConfig();

  const name = input.name.trim();
  const companyLocation = input.companyLocation.trim();
  const customerInquiryContact = input.customerInquiryContact.trim();
  const contactPersonName = input.contactPersonName.trim();
  const contactPersonPhone = input.contactPersonPhone.trim();
  const contactEmail = input.contactEmail.trim().toLowerCase();
  const contactPersonLastName = input.contactPersonLastName.trim();
  const contactPersonFirstName = input.contactPersonFirstName.trim();

  if (!input.termsAgreed) {
    throw new Error("規約への同意が必要です");
  }

  if (
    !name ||
    !companyLocation ||
    !customerInquiryContact ||
    !contactPersonName ||
    !contactPersonPhone ||
    !contactEmail ||
    !contactPersonLastName ||
    !contactPersonFirstName ||
    !input.storeAddressMode
  ) {
    throw new Error("必須項目を入力してください");
  }

  if (input.storeAddressMode === "other" && !input.storeAddressOther?.trim()) {
    throw new Error("店舗住所（その他）を入力してください");
  }

  if (!isValidEmail(contactEmail)) {
    throw new Error("メールアドレスの形式が正しくありません");
  }

  const existingByEmail = await listMerchantUsersByEmail(
    {
      region: config.region,
      tableName: config.merchantUserTableName,
    },
    contactEmail,
  );

  if (existingByEmail.some((user) => user.status !== "DELETED")) {
    throw new Error("入力されたメールアドレスはすでに使用されています");
  }

  const userId = "mu-001";
  const now = new Date().toISOString();

  // ID 採番（最大値+1）は並行登録で衝突し得る。条件付き Put（attribute_not_exists）で
  // 他社レコードの黙った上書きを防ぎ、衝突時は採番からやり直す（公開エンドポイントのため特に重要）。
  const MAX_ID_ATTEMPTS = 5;
  let merchant: Merchant | null = null;
  let merchantUser: MerchantUserItem | null = null;

  for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt += 1) {
    const merchants = await listMerchants({
      region: config.region,
      tableName: config.merchantTableName,
    });
    const merchantId = getNextMerchantId(merchants);

    const candidateMerchant: Merchant = {
      merchantId,
      name,
      kanaName: normalizeOptionalText(input.kanaName),
      status: "PENDING",
      companyLocation,
      storeAddressMode: input.storeAddressMode,
      storeAddressOther:
        input.storeAddressMode === "other" ? normalizeOptionalText(input.storeAddressOther) : undefined,
      customerInquiryContact,
      contactPersonName,
      contactPersonPhone,
      contactEmail,
      bankTransferAccount: normalizeOptionalText(input.bankTransferAccount),
      paymentCycle: normalizeOptionalText(input.paymentCycle),
      createdAt: now,
      updatedAt: now,
    };

    try {
      await putMerchant(
        {
          region: config.region,
          tableName: config.merchantTableName,
        },
        candidateMerchant,
        { conditionExpression: "attribute_not_exists(merchantId)" },
      );
    } catch (error) {
      if (isConditionalCheckFailure(error) && attempt < MAX_ID_ATTEMPTS - 1) {
        continue;
      }
      throw error;
    }

    merchant = candidateMerchant;
    merchantUser = {
      merchantId,
      sk: buildMerchantUserSk(userId),
      userId,
      lastName: contactPersonLastName,
      firstName: contactPersonFirstName,
      lastNameKana: normalizeOptionalText(input.contactPersonLastNameKana),
      firstNameKana: normalizeOptionalText(input.contactPersonFirstNameKana),
      email: contactEmail,
      phoneNumber: contactPersonPhone,
      roles: ["MERCHANT"],
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
      gsi2pk: buildMerchantUserByEmailGsiPk(contactEmail),
    };
    break;
  }

  if (!merchant || !merchantUser) {
    throw new Error("加盟店IDの採番に失敗しました。時間をおいてもう一度お試しください。");
  }

  await putMerchantUser(
    {
      region: config.region,
      tableName: config.merchantUserTableName,
    },
    merchantUser,
    { conditionExpression: "attribute_not_exists(sk)" },
  );

  await notifyMerchantRegistrationSubmitted({
    config,
    merchant,
    merchantUser,
    submittedAt: now,
  });

  return { merchantId: merchant.merchantId };
}
