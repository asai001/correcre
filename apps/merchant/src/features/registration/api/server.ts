import "server-only";

import { listMerchants, putMerchant } from "@correcre/lib/dynamodb/merchant";
import {
  buildMerchantUserByEmailGsiPk,
  buildMerchantUserSk,
  listMerchantUsersByEmail,
  putMerchantUser,
} from "@correcre/lib/dynamodb/merchant-user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
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

  const merchants = await listMerchants({
    region: config.region,
    tableName: config.merchantTableName,
  });

  const merchantId = getNextMerchantId(merchants);
  const userId = "mu-001";
  const now = new Date().toISOString();

  const merchant: Merchant = {
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

  const merchantUser: MerchantUserItem = {
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

  await putMerchant(
    {
      region: config.region,
      tableName: config.merchantTableName,
    },
    merchant,
  );

  await putMerchantUser(
    {
      region: config.region,
      tableName: config.merchantUserTableName,
    },
    merchantUser,
  );

  return { merchantId };
}
