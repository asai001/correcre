import "server-only";

import type { Merchant, Merchandise, MerchantUserItem } from "@correcre/types";

import { sendSesEmail } from "../email/ses";
import { readRequiredServerEnv } from "../env/server";
import { resolveOperatorNotificationRecipients } from "./operator-recipients";

const DEFAULT_SES_FROM_EMAIL = "correcre-info@efficient-technology.com";

function readOptionalServerEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function getSesFromEmail() {
  return readOptionalServerEnv("SES_FROM_EMAIL") ?? DEFAULT_SES_FROM_EMAIL;
}

function getRegion(region?: string) {
  return region ?? readRequiredServerEnv("AWS_REGION");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatYen(value: number) {
  return new Intl.NumberFormat("ja-JP").format(value);
}

function getMerchantName(merchant: Pick<Merchant, "merchantId" | "name" | "displayName">) {
  return merchant.displayName?.trim() || merchant.name.trim() || merchant.merchantId;
}

function getMerchantUserName(user: Pick<MerchantUserItem, "lastName" | "firstName">) {
  return [user.lastName.trim(), user.firstName.trim()].filter(Boolean).join(" ");
}

function getOperatorMerchantsUrl() {
  const configuredUrl = readOptionalServerEnv("OPERATOR_APP_URL");
  const baseUrl = configuredUrl || (process.env.NODE_ENV === "development" ? "http://localhost:3002" : undefined);

  return baseUrl ? `${baseUrl.replace(/\/+$/, "")}/merchants` : undefined;
}

function appendOperatorUrl(lines: string[]) {
  const operatorUrl = getOperatorMerchantsUrl();
  if (operatorUrl) {
    lines.push("", "運用者画面:", operatorUrl);
  }
}

function buildMerchantRegistrationAcceptedBody(params: {
  merchant: Merchant;
  merchantUser: MerchantUserItem;
  submittedAt: string;
}) {
  const merchantName = getMerchantName(params.merchant);
  const applicantName = getMerchantUserName(params.merchantUser) || params.merchant.contactPersonName;

  return `${applicantName} 様

コレクレへの提携企業登録申請を受け付けました。
運用者による確認が完了しましたら、登録メールアドレス宛に改めてご案内します。

申請内容:
提携企業名: ${merchantName}
申請ID: ${params.merchant.merchantId}
担当者名: ${params.merchant.contactPersonName}
メールアドレス: ${params.merchantUser.email}
申請日時: ${formatDateTime(params.submittedAt)}

本メールはシステムより自動送信されています。`;
}

function buildOperatorMerchantRegistrationBody(params: {
  merchant: Merchant;
  merchantUser: MerchantUserItem;
  submittedAt: string;
}) {
  const merchantName = getMerchantName(params.merchant);
  const applicantName = getMerchantUserName(params.merchantUser) || params.merchant.contactPersonName;
  const lines = [
    "コレクレ運用ご担当者様",
    "",
    "提携企業登録の申請がありました。",
    "",
    "申請内容:",
    `提携企業名: ${merchantName}`,
    `申請ID: ${params.merchant.merchantId}`,
    `ステータス: ${params.merchant.status}`,
    `所在地: ${params.merchant.companyLocation}`,
    `担当者名: ${applicantName}`,
    `担当者電話番号: ${params.merchant.contactPersonPhone}`,
    `担当者メールアドレス: ${params.merchantUser.email}`,
    `お客様問い合わせ先: ${params.merchant.customerInquiryContact}`,
    `申請日時: ${formatDateTime(params.submittedAt)}`,
  ];

  appendOperatorUrl(lines);
  lines.push("", "本メールはシステムより自動送信されています。");

  return lines.join("\n");
}

function buildOperatorMerchandiseBody(params: {
  eventLabel: "登録" | "公開";
  merchant: Pick<Merchant, "merchantId" | "name" | "displayName">;
  merchandise: Merchandise;
  occurredAt: string;
}) {
  const merchantName = getMerchantName(params.merchant);
  const lines = [
    "コレクレ運用ご担当者様",
    "",
    `提携企業側アプリで商品・サービスが${params.eventLabel}されました。`,
    "",
    "商品・サービス情報:",
    `商品・サービス名: ${params.merchandise.merchandiseName}`,
    `商品ID: ${params.merchandise.merchandiseId}`,
    `商品コード: ${params.merchandise.productCode ?? params.merchandise.merchandiseId}`,
    `ステータス: ${params.merchandise.status}`,
    `見出し: ${params.merchandise.heading}`,
    `価格: ${formatYen(params.merchandise.priceYen)}円`,
    `必要ポイント: ${formatYen(params.merchandise.requiredPoint)}pt`,
    `提供会社: ${merchantName}`,
    `提携企業ID: ${params.merchant.merchantId}`,
    `${params.eventLabel}日時: ${formatDateTime(params.occurredAt)}`,
  ];

  appendOperatorUrl(lines);
  lines.push("", "本メールはシステムより自動送信されています。");

  return lines.join("\n");
}

export async function sendMerchantRegistrationAcceptedEmail(input: {
  region?: string;
  merchant: Merchant;
  merchantUser: MerchantUserItem;
  submittedAt: string;
}) {
  const region = getRegion(input.region);

  await sendSesEmail(
    {
      region,
      fromEmail: getSesFromEmail(),
    },
    {
      to: input.merchantUser.email,
      subject: "【コレクレ】提携企業登録申請を受け付けました",
      text: buildMerchantRegistrationAcceptedBody(input),
    },
  );
}

export async function sendOperatorMerchantRegistrationSubmittedEmail(input: {
  region?: string;
  merchant: Merchant;
  merchantUser: MerchantUserItem;
  submittedAt: string;
}) {
  const region = getRegion(input.region);
  const recipients = await resolveOperatorNotificationRecipients({ region });

  await sendSesEmail(
    {
      region,
      fromEmail: getSesFromEmail(),
    },
    {
      to: recipients,
      subject: `【コレクレ】提携企業登録申請がありました: ${getMerchantName(input.merchant)}`,
      text: buildOperatorMerchantRegistrationBody(input),
    },
  );
}

export async function sendOperatorMerchandiseCreatedEmail(input: {
  region?: string;
  merchant: Pick<Merchant, "merchantId" | "name" | "displayName">;
  merchandise: Merchandise;
  occurredAt: string;
}) {
  const region = getRegion(input.region);
  const recipients = await resolveOperatorNotificationRecipients({ region });

  await sendSesEmail(
    {
      region,
      fromEmail: getSesFromEmail(),
    },
    {
      to: recipients,
      subject: `【コレクレ】商品・サービスが登録されました: ${input.merchandise.merchandiseName}`,
      text: buildOperatorMerchandiseBody({
        eventLabel: "登録",
        merchant: input.merchant,
        merchandise: input.merchandise,
        occurredAt: input.occurredAt,
      }),
    },
  );
}

export async function sendOperatorMerchandisePublishedEmail(input: {
  region?: string;
  merchant: Pick<Merchant, "merchantId" | "name" | "displayName">;
  merchandise: Merchandise;
  occurredAt: string;
}) {
  const region = getRegion(input.region);
  const recipients = await resolveOperatorNotificationRecipients({ region });

  await sendSesEmail(
    {
      region,
      fromEmail: getSesFromEmail(),
    },
    {
      to: recipients,
      subject: `【コレクレ】商品・サービスが公開されました: ${input.merchandise.merchandiseName}`,
      text: buildOperatorMerchandiseBody({
        eventLabel: "公開",
        merchant: input.merchant,
        merchandise: input.merchandise,
        occurredAt: input.occurredAt,
      }),
    },
  );
}
