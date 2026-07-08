import "server-only";

import type {
  SupportInquiryCategory,
  SupportInquiryItem,
  SupportInquirySource,
  SupportInquirySubmitter,
} from "@correcre/types";

import {
  buildSupportInquiryCreatedAtGsiSk,
  buildSupportInquiryPk,
  buildSupportInquiryStatusGsiPk,
  putSupportInquiry,
  resolveSupportInquiryTableName,
  updateSupportInquiryNotificationResult,
} from "./dynamodb/support-inquiry";
import { sendSesEmail } from "./email/ses";
import { readRequiredServerEnv } from "./env/server";
import { resolveOperatorNotificationRecipients } from "./notification/operator-recipients";

const DEFAULT_SES_FROM_EMAIL = "correcre-info@efficient-technology.com";

const SOURCE_LABELS: Record<SupportInquirySource, string> = {
  ADMIN: "企業側アプリ",
  MERCHANT: "提携企業側アプリ",
};

const CATEGORY_LABELS: Record<SupportInquiryCategory, string> = {
  LOGIN: "ログイン・招待",
  ACCOUNT: "アカウント・権限",
  MERCHANDISE: "商品・サービス",
  EXCHANGE: "交換管理",
  BILLING: "請求・精算",
  DATA: "データ確認",
  SYSTEM: "不具合・システム",
  OTHER: "その他",
};

export type CreateSupportInquiryInput = {
  source: SupportInquirySource;
  category: SupportInquiryCategory;
  subject: string;
  body: string;
  submitter: SupportInquirySubmitter;
  currentUrl?: string;
  userAgent?: string;
};

export type CreatedSupportInquiry = {
  inquiryId: string;
  createdAt: string;
  notificationDelivered: boolean;
};

function readOptionalServerEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function formatSubmitter(submitter: SupportInquirySubmitter) {
  const lines = [
    `ユーザーID: ${submitter.userId}`,
    `メールアドレス: ${submitter.email}`,
    submitter.name ? `氏名: ${submitter.name}` : undefined,
    submitter.companyId ? `企業ID: ${submitter.companyId}` : undefined,
    submitter.companyName ? `企業名: ${submitter.companyName}` : undefined,
    submitter.merchantId ? `提携企業ID: ${submitter.merchantId}` : undefined,
    submitter.merchantName ? `提携企業名: ${submitter.merchantName}` : undefined,
  ];

  return lines.filter(Boolean).join("\n");
}

function buildNotificationBody(item: SupportInquiryItem) {
  return `運用者各位

コレクレの${SOURCE_LABELS[item.source]}から問い合わせが送信されました。

問い合わせID: ${item.inquiryId}
受付日時: ${item.createdAt}
送信元: ${SOURCE_LABELS[item.source]}
カテゴリ: ${CATEGORY_LABELS[item.category]}
件名: ${item.subject}

送信者情報:
${formatSubmitter(item.submitter)}

現在のURL: ${item.currentUrl ?? "-"}

問い合わせ内容:
${item.body}
`;
}

export async function createSupportInquiry(input: CreateSupportInquiryInput): Promise<CreatedSupportInquiry> {
  const region = readRequiredServerEnv("AWS_REGION");
  const tableName = resolveSupportInquiryTableName();

  if (!tableName) {
    throw new Error("DDB_SUPPORT_INQUIRY_TABLE_NAME is not set.");
  }

  const inquiryId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const gsiSk = buildSupportInquiryCreatedAtGsiSk(createdAt, inquiryId);
  const tableConfig = { region, tableName };
  const item: SupportInquiryItem = {
    pk: buildSupportInquiryPk(inquiryId),
    inquiryId,
    source: input.source,
    category: input.category,
    subject: input.subject.trim(),
    body: input.body.trim(),
    status: "OPEN",
    submitter: input.submitter,
    currentUrl: normalizeOptionalText(input.currentUrl),
    userAgent: normalizeOptionalText(input.userAgent),
    createdAt,
    updatedAt: createdAt,
    gsi1pk: "SUPPORT_INQUIRY",
    gsi1sk: gsiSk,
    gsi2pk: buildSupportInquiryStatusGsiPk("OPEN"),
    gsi2sk: gsiSk,
  };

  await putSupportInquiry(tableConfig, item);

  try {
    const recipients = await resolveOperatorNotificationRecipients({
      region,
      fallbackEmail: readOptionalServerEnv("OPERATOR_NOTIFICATION_FALLBACK_EMAIL"),
    });
    await sendSesEmail(
      {
        region,
        fromEmail: readOptionalServerEnv("SES_FROM_EMAIL") ?? DEFAULT_SES_FROM_EMAIL,
      },
      {
        to: recipients,
        subject: `【コレクレ】問い合わせ: ${item.subject}`,
        text: buildNotificationBody(item),
      },
    );
    await updateSupportInquiryNotificationResult(tableConfig, {
      inquiryId,
      notifiedAt: new Date().toISOString(),
      recipients,
    });

    return {
      inquiryId,
      createdAt,
      notificationDelivered: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unknown_error";
    console.error("Failed to send support inquiry notification.", {
      inquiryId,
      error,
    });
    await updateSupportInquiryNotificationResult(tableConfig, {
      inquiryId,
      errorMessage,
    }).catch((updateError) => {
      console.error("Failed to store support inquiry notification error.", updateError);
    });

    return {
      inquiryId,
      createdAt,
      notificationDelivered: false,
    };
  }
}
