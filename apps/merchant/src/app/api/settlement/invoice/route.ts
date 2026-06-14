import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";
import { getMerchantById } from "@correcre/lib/dynamodb/merchant";
import { getOperatorNotificationEmails } from "@correcre/lib/dynamodb/system-setting";
import { sendSesEmail } from "@correcre/lib/email/ses";
import { readRequiredServerEnv } from "@correcre/lib/env/server";

import { getSettlementForMonth } from "@merchant/features/settlement/api/server";
import { getMerchantAccessStatus } from "@merchant/lib/auth/merchant";

const FAILED_MESSAGE = "請求メールの送信に失敗しました。時間をおいて再度お試しください。";
// 運用者画面の設定（system-setting テーブル）が未設定の場合のフォールバック宛先。
const DEFAULT_OPERATOR_NOTIFICATION_EMAIL = "correcre-info@efficient-technology.com";
const DEFAULT_SES_FROM_EMAIL = "correcre-info@efficient-technology.com";

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
  contactEmail?: string;
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

※ ご請求額は売上から交換手数料（${feePercentLabel}・端数切り捨て）を差し引いた金額です。
${params.contactEmail ? `\nお問い合わせ先：${params.contactEmail}\n` : ""}
本メールは提携企業向け管理画面の操作により自動送信されています。`;
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
    const merchant = await getMerchantById(
      { region, tableName: readRequiredServerEnv("DDB_MERCHANT_TABLE_NAME") },
      merchantId,
    );

    const merchantName = merchant?.name ?? merchantId;

    // 宛先は運用者画面で設定された通知先メールアドレス（複数可）を使う。
    const configuredEmails = await getOperatorNotificationEmails({
      region,
      tableName: readRequiredServerEnv("DDB_SYSTEM_SETTING_TABLE_NAME"),
    });
    const recipients = configuredEmails.length ? configuredEmails : [DEFAULT_OPERATOR_NOTIFICATION_EMAIL];

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
          contactEmail: merchant?.contactEmail,
          month,
          exchangeCount: settlement.exchangeCount,
          salesYen: settlement.salesYen,
          exchangeFeeYen: settlement.exchangeFeeYen,
          exchangeFeePercent,
          invoiceYen: settlement.invoiceYen,
        }),
      },
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/settlement/invoice error", err);
    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: FAILED_MESSAGE }, { status: 500 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
