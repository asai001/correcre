import "server-only";

import { getMerchantById, putMerchant } from "@correcre/lib/dynamodb/merchant";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import type { Merchant } from "@correcre/types";

import type { MerchantCompanyInfo, UpdateMerchantCompanyInfoInput } from "../model/types";

type RuntimeConfig = {
  region: string;
  merchantTableName: string;
};

function getRuntimeConfig(): RuntimeConfig {
  return {
    region: readRequiredServerEnv("AWS_REGION"),
    merchantTableName: readRequiredServerEnv("DDB_MERCHANT_TABLE_NAME"),
  };
}

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 運用者側 normalizeMerchantInput と同じ必須・形式チェックを行う（status / 交換手数料率は対象外）。
function normalizeCompanyInfoInput(input: UpdateMerchantCompanyInfoInput) {
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
    throw new Error("会社情報の必須項目を入力してください");
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
    displayName: normalizeOptionalText(input.displayName),
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

function toCompanyInfo(merchant: Merchant): MerchantCompanyInfo {
  return {
    merchantId: merchant.merchantId,
    name: merchant.name,
    displayName: merchant.displayName,
    kanaName: merchant.kanaName,
    companyLocation: merchant.companyLocation,
    storeAddressMode: merchant.storeAddressMode,
    storeAddressOther: merchant.storeAddressOther,
    customerInquiryContact: merchant.customerInquiryContact,
    contactPersonName: merchant.contactPersonName,
    contactPersonPhone: merchant.contactPersonPhone,
    contactEmail: merchant.contactEmail,
    bankTransferAccount: merchant.bankTransferAccount,
    paymentCycle: merchant.paymentCycle,
    updatedAt: merchant.updatedAt,
  };
}

export async function getMerchantCompanyInfo(merchantId: string): Promise<MerchantCompanyInfo> {
  const config = getRuntimeConfig();
  const merchant = await getMerchantById(
    {
      region: config.region,
      tableName: config.merchantTableName,
    },
    merchantId,
  );

  if (!merchant) {
    throw new Error("会社情報が見つかりません");
  }

  return toCompanyInfo(merchant);
}

export async function updateMerchantCompanyInfo(
  merchantId: string,
  input: UpdateMerchantCompanyInfoInput,
): Promise<MerchantCompanyInfo> {
  const config = getRuntimeConfig();
  const existing = await getMerchantById(
    {
      region: config.region,
      tableName: config.merchantTableName,
    },
    merchantId,
  );

  if (!existing) {
    throw new Error("会社情報が見つかりません");
  }

  const normalized = normalizeCompanyInfoInput(input);
  const now = new Date().toISOString();

  // status・exchangeFeePercent・createdAt は提携企業からは変更せず据え置く。
  const merchant: Merchant = {
    ...existing,
    name: normalized.name,
    displayName: normalized.displayName,
    kanaName: normalized.kanaName,
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

  return toCompanyInfo(merchant);
}
