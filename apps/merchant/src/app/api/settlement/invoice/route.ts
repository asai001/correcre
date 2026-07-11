import { NextResponse } from "next/server";

import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { isAwsCredentialError } from "@correcre/lib/aws/credentials";
import { getDynamoDocumentClient } from "@correcre/lib/dynamodb/client";
import { getMerchantById } from "@correcre/lib/dynamodb/merchant";
import { getOperatorNotificationEmails, resolveSystemSettingTableName } from "@correcre/lib/dynamodb/system-setting";
import { listOperatorUsers } from "@correcre/lib/dynamodb/user";
import { sendSesEmail } from "@correcre/lib/email/ses";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import type { Merchant } from "@correcre/types";

import { getSettlementForMonth } from "@merchant/features/settlement/api/server";
import { getMerchantAccessStatus } from "@merchant/lib/auth/merchant";

const FAILED_MESSAGE = "請求メールの送信に失敗しました。時間をおいて再度お試しください。";
// 運用者画面の設定（system-setting テーブル）が未設定の場合のフォールバック宛先。
const DEFAULT_OPERATOR_NOTIFICATION_EMAIL = "correcre-info@efficient-technology.com";
const DEFAULT_SES_FROM_EMAIL = "correcre-info@efficient-technology.com";
const NOTIFIABLE_OPERATOR_STATUSES = new Set(["INVITED", "ACTIVE"]);

function readOptionalServerEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("ja-JP").format(value);
}

function formatMonthLabel(month: string) {
  const [year, mon] = month.split("-");
  return `${year}年${Number(mon)}月`;
}

function currentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function buildInvoiceEmailBody(params: {
  merchantName: string;
  contactPersonName?: string;
  contactPersonPhone?: string;
  contactEmail?: string;
  bankTransferAccount?: string;
  month: string;
  exchangeCount: number;
  salesYen: number;
  exchangeFeeYen: number;
  exchangeFeePercent: number;
  invoiceYen: number;
}) {
  const feePercentLabel = `${params.exchangeFeePercent}%`;

  return `運用者 ご担当者様

平素よりコレクレをご利用いただきありがとうございます。
提携企業「${params.merchantName}」より、${formatMonthLabel(params.month)}分のご請求のご案内です。

対象月：${formatMonthLabel(params.month)}
交換件数：${formatInteger(params.exchangeCount)}件
売上（交換相当額）：${formatInteger(params.salesYen)}円
交換手数料（${feePercentLabel}）：${formatInteger(params.exchangeFeeYen)}円
ご請求額：${formatInteger(params.invoiceYen)}円

■ 提携企業情報
担当者名：${params.contactPersonName || "未設定"}
電話番号：${params.contactPersonPhone || "未設定"}
代表メールアドレス：${params.contactEmail || "未設定"}
振込先：
${params.bankTransferAccount || "未設定"}

※ ご請求額は売上から交換手数料（${feePercentLabel}・端数切り捨て）を差し引いた金額です。
本メールは提携企業向け管理画面の操作により自動送信されています。`;
}

function isConditionalCheckFailed(error: unknown) {
  return typeof error === "object" && error !== null && (error as { name?: string }).name === "ConditionalCheckFailedException";
}

async function resolveOperatorNotificationRecipients(region: string): Promise<string[]> {
  const systemSettingTableName = resolveSystemSettingTableName();
  const configuredEmails = systemSettingTableName
    ? await getOperatorNotificationEmails({
        region,
        tableName: systemSettingTableName,
      })
    : [];

  if (configuredEmails.length) {
    return configuredEmails;
  }

  const operators = await listOperatorUsers({
    region,
    tableName: readRequiredServerEnv("DDB_USER_TABLE_NAME"),
  });
  const operatorEmails = [
    ...new Set(
      operators
        .filter((user) => NOTIFIABLE_OPERATOR_STATUSES.has(user.status))
        .map((user) => user.email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];

  return operatorEmails.length ? operatorEmails : [DEFAULT_OPERATOR_NOTIFICATION_EMAIL];
}

async function markInvoiceEmailSent(params: {
  region: string;
  tableName: string;
  merchant: Merchant;
  month: string;
  sentAt: string;
}) {
  const client = getDynamoDocumentClient(params.region);

  // マップ全体を読み込み値から再構築して SET すると、別月の同時送信でお互いのマーカーを消してしまい
  // 請求メールが重複送信され得る。属性(キー)単位で更新し、他の月のエントリに触れないようにする。
  // ネストしたキーを設定するには親マップが存在している必要があるため、まず if_not_exists で初期化する。
  await client.send(
    new UpdateCommand({
      TableName: params.tableName,
      Key: {
        merchantId: params.merchant.merchantId,
      },
      UpdateExpression: "SET invoiceEmailSentMonths = if_not_exists(invoiceEmailSentMonths, :emptyMap)",
      ExpressionAttributeValues: {
        ":emptyMap": {},
      },
    }),
  );

  await client.send(
    new UpdateCommand({
      TableName: params.tableName,
      Key: {
        merchantId: params.merchant.merchantId,
      },
      ConditionExpression: "attribute_not_exists(invoiceEmailSentMonths.#month)",
      UpdateExpression: "SET invoiceEmailSentMonths.#month = :sentAt, updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#month": params.month,
      },
      ExpressionAttributeValues: {
        ":sentAt": params.sentAt,
        ":updatedAt": params.sentAt,
      },
    }),
  );
}

async function rollbackInvoiceEmailSent(params: {
  region: string;
  tableName: string;
  merchantId: string;
  month: string;
  sentAt: string;
}) {
  const client = getDynamoDocumentClient(params.region);
  await client.send(
    new UpdateCommand({
      TableName: params.tableName,
      Key: {
        merchantId: params.merchantId,
      },
      ConditionExpression: "invoiceEmailSentMonths.#month = :sentAt",
      UpdateExpression: "SET updatedAt = :updatedAt REMOVE invoiceEmailSentMonths.#month",
      ExpressionAttributeNames: {
        "#month": params.month,
      },
      ExpressionAttributeValues: {
        ":sentAt": params.sentAt,
        ":updatedAt": new Date().toISOString(),
      },
    }),
  );
}

async function authorize() {
  const access = await getMerchantAccessStatus();

  if (access.allowed) {
    return { user: access.user, error: null as null | NextResponse };
  }

  const status = access.reason === "unauthenticated" ? 401 : 403;
  const error = access.reason === "unauthenticated" ? "unauthorized" : "merchant_only";

  return { user: null, error: NextResponse.json({ error }, { status }) };
}

export async function POST(req: Request) {
  const { user, error } = await authorize();
  if (error) return error;

  let month: string;
  try {
    const body = (await req.json()) as { month?: unknown };
    month = typeof body.month === "string" ? body.month : "";
  } catch {
    month = "";
  }

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return NextResponse.json({ error: "対象月の指定が不正です。" }, { status: 400 });
  }

  // 請求は月単位（締め後）のため、当月以降の月は送信できない。
  if (month >= currentYearMonth()) {
    return NextResponse.json(
      { error: "当月分の請求メールはまだ送信できません。送信できるのは前月分までです。" },
      { status: 400 },
    );
  }

  try {
    const merchantId = user!.merchantId;
    const { settlement, exchangeFeePercent } = await getSettlementForMonth(merchantId, month);

    if (settlement.salesYen <= 0) {
      return NextResponse.json(
        { error: "対象月の売上がないため、請求メールを送信できません。" },
        { status: 400 },
      );
    }

    const region = readRequiredServerEnv("AWS_REGION");
    const merchantTableName = readRequiredServerEnv("DDB_MERCHANT_TABLE_NAME");
    const merchant = await getMerchantById(
      { region, tableName: merchantTableName },
      merchantId,
    );

    if (!merchant) {
      return NextResponse.json({ error: "提携企業情報が見つかりません。" }, { status: 404 });
    }

    if (merchant.invoiceEmailSentMonths?.[month] || settlement.invoiceEmailSentAt) {
      return NextResponse.json(
        { error: `${formatMonthLabel(month)}分の請求メールはすでに送信済みです。` },
        { status: 400 },
      );
    }

    const merchantName = merchant.name ?? merchantId;
    const recipients = await resolveOperatorNotificationRecipients(region);
    const sentAt = new Date().toISOString();

    try {
      await markInvoiceEmailSent({
        region,
        tableName: merchantTableName,
        merchant,
        month,
        sentAt,
      });
    } catch (markError) {
      if (isConditionalCheckFailed(markError)) {
        return NextResponse.json(
          { error: `${formatMonthLabel(month)}分の請求メールはすでに送信済みです。` },
          { status: 409 },
        );
      }

      throw markError;
    }

    try {
      await sendSesEmail(
        {
          region,
          fromEmail: readOptionalServerEnv("SES_FROM_EMAIL") ?? DEFAULT_SES_FROM_EMAIL,
        },
        {
          to: recipients,
          subject: `【コレクレ】${merchantName} ${formatMonthLabel(month)}分 ご請求のご案内`,
          text: buildInvoiceEmailBody({
            merchantName,
            contactPersonName: merchant.contactPersonName,
            contactPersonPhone: merchant.contactPersonPhone,
            contactEmail: merchant.contactEmail,
            bankTransferAccount: merchant.bankTransferAccount,
            month,
            exchangeCount: settlement.exchangeCount,
            salesYen: settlement.salesYen,
            exchangeFeeYen: settlement.exchangeFeeYen,
            exchangeFeePercent,
            invoiceYen: settlement.invoiceYen,
          }),
        },
      );
    } catch (sendError) {
      try {
        await rollbackInvoiceEmailSent({
          region,
          tableName: merchantTableName,
          merchantId,
          month,
          sentAt,
        });
      } catch (rollbackError) {
        console.error("Failed to roll back invoice email sent marker.", rollbackError);
      }

      throw sendError;
    }

    return NextResponse.json({ ok: true, sentAt });
  } catch (err) {
    console.error("POST /api/settlement/invoice error", err);
    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: FAILED_MESSAGE }, { status: 500 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
