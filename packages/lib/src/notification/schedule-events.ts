import "server-only";

import type { DeliveryCandidate, ExchangeHistoryItem, Merchant } from "@correcre/types";

import { formatWeekdayJa } from "../date/business-days";
import { listMerchantUsersByMerchant } from "../dynamodb/merchant-user";
import { sendSesEmail } from "../email/ses";
import { readRequiredServerEnv } from "../env/server";

// 配送日程調整に関する通知メール。すべてプレーンテキスト・fire-and-forget で送る
// （送信失敗が業務トランザクションを巻き戻さないよう、呼び出し側で catch してログに残す）。

const DEFAULT_SES_FROM_EMAIL = "correcre-info@efficient-technology.com";
const NOTIFIABLE_MERCHANT_USER_STATUSES = new Set(["INVITED", "ACTIVE"]);

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

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function getMerchantExchangeUrl(exchangeId: string) {
  const baseUrl =
    readOptionalServerEnv("MERCHANT_APP_URL") ??
    (process.env.NODE_ENV === "development" ? "http://localhost:3003" : undefined);
  return baseUrl ? `${normalizeBaseUrl(baseUrl)}/exchanges/${encodeURIComponent(exchangeId)}` : undefined;
}

function getEmployeeScheduleUrl(exchangeId: string) {
  const baseUrl =
    readOptionalServerEnv("EMPLOYEE_APP_URL") ??
    (process.env.NODE_ENV === "development" ? "http://localhost:3000" : undefined);
  return baseUrl ? `${normalizeBaseUrl(baseUrl)}/exchange-history/${encodeURIComponent(exchangeId)}` : undefined;
}

function formatDateJa(date: string) {
  const [, month, day] = date.split("-").map(Number);
  return `${month}月${day}日(${formatWeekdayJa(date)})`;
}

function formatDeadlineJa(iso: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function normalizeEmailAddress(value?: string) {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : undefined;
}

export type ScheduleNotificationConfig = {
  region?: string;
  merchantUserTableName?: string;
};

// merchant への通知先。contactEmail を優先し、なければ有効な merchant ユーザー全員。
export async function resolveMerchantScheduleRecipients(
  config: ScheduleNotificationConfig,
  merchant: Merchant | null,
): Promise<string[]> {
  const contactEmail = normalizeEmailAddress(merchant?.contactEmail);
  if (contactEmail) {
    return [contactEmail];
  }

  if (!merchant || !config.merchantUserTableName) {
    return [];
  }

  const users = await listMerchantUsersByMerchant(
    {
      region: getRegion(config.region),
      tableName: config.merchantUserTableName,
    },
    merchant.merchantId,
  );

  return [
    ...new Set(
      users
        .filter((user) => NOTIFIABLE_MERCHANT_USER_STATUSES.has(user.status))
        .map((user) => normalizeEmailAddress(user.email))
        .filter((email): email is string => Boolean(email)),
    ),
  ];
}

async function sendMail(region: string | undefined, to: string | string[], subject: string, lines: string[]) {
  const recipients = Array.isArray(to) ? to : [to];
  if (recipients.length === 0) {
    return;
  }

  await sendSesEmail(
    {
      region: getRegion(region),
      fromEmail: getSesFromEmail(),
    },
    {
      to: recipients,
      subject,
      text: `${lines.join("\n")}\n\n本メールはシステムより自動送信されています。`,
    },
  );
}

function merchantLinkLines(exchangeId: string): string[] {
  const url = getMerchantExchangeUrl(exchangeId);
  return url ? ["", "交換の詳細・操作はこちら:", url] : [];
}

function employeeLinkLines(exchangeId: string): string[] {
  const url = getEmployeeScheduleUrl(exchangeId);
  return url ? ["", "お届け日の確認・選択はこちら:", url] : [];
}

/** 申請 24h 無反応の merchant への候補提示の再通知（日次バッチ） */
export async function sendMerchantProposalReminderEmail(params: {
  config: ScheduleNotificationConfig;
  recipients: string[];
  exchange: ExchangeHistoryItem;
}) {
  await sendMail(
    params.config.region,
    params.recipients,
    "【コレクレ】お届け候補日の提示をお願いします",
    [
      "ご担当者様",
      "",
      "お届け日の調整が必要な交換申請に、候補日がまだ提示されていません。",
      "従業員がお届け日を選択できるよう、候補日の提示をお願いします。",
      "",
      `商品・サービス名：${params.exchange.merchandiseNameSnapshot}`,
      `申請番号：${params.exchange.exchangeId}`,
      ...merchantLinkLines(params.exchange.exchangeId),
    ],
  );
}

/** 候補提示時の employee への選択依頼（期限を明記） */
export async function sendEmployeeSelectionRequestEmail(params: {
  config: ScheduleNotificationConfig;
  recipient: string;
  exchange: ExchangeHistoryItem;
  candidates: DeliveryCandidate[];
  isRegenerated?: boolean;
}) {
  const candidateLines = params.candidates.map(
    (candidate) =>
      `・${formatDateJa(candidate.arrivalDate)} 着（${formatDeadlineJa(candidate.selectableUntil)} まで選択可能）`,
  );

  await sendMail(
    params.config.region,
    params.recipient,
    params.isRegenerated
      ? "【コレクレ】お届け日の候補が再提示されました"
      : "【コレクレ】お届け日を選択してください",
    [
      `「${params.exchange.merchandiseNameSnapshot}」のお届け候補日が${params.isRegenerated ? "再" : ""}提示されました。`,
      "各候補には選択期限があります。期限内にお届け日をお選びください。",
      "",
      ...candidateLines,
      ...employeeLinkLines(params.exchange.exchangeId),
    ],
  );
}

/** 選択期限 24h 前の employee への催促（日次バッチ） */
export async function sendEmployeeSelectionReminderEmail(params: {
  config: ScheduleNotificationConfig;
  recipient: string;
  exchange: ExchangeHistoryItem;
  nearestDeadline: string;
}) {
  await sendMail(
    params.config.region,
    params.recipient,
    "【コレクレ】お届け日の選択期限が近づいています",
    [
      `「${params.exchange.merchandiseNameSnapshot}」のお届け日がまだ選択されていません。`,
      `最も早い候補は ${formatDeadlineJa(params.nearestDeadline)} で受付を終了します。`,
      "期限を過ぎた候補は選択できなくなりますので、お早めにお選びください。",
      ...employeeLinkLines(params.exchange.exchangeId),
    ],
  );
}

/** 希望日申請時の merchant への応答依頼 */
export async function sendMerchantDateRequestedEmail(params: {
  config: ScheduleNotificationConfig;
  recipients: string[];
  exchange: ExchangeHistoryItem;
  requestedArrivalDate: string;
  requestedTimeSlot?: string;
  requestedNote?: string;
}) {
  await sendMail(
    params.config.region,
    params.recipients,
    "【コレクレ】お届け希望日への応答をお願いします",
    [
      "ご担当者様",
      "",
      "従業員から、提示した候補以外のお届け希望日が届いています。",
      "48 時間以内に、承諾・別候補の再提示・対応不可のいずれかで応答してください。",
      "",
      `商品・サービス名：${params.exchange.merchandiseNameSnapshot}`,
      `希望日：${formatDateJa(params.requestedArrivalDate)}${params.requestedTimeSlot ? ` ${params.requestedTimeSlot}` : ""}`,
      ...(params.requestedNote ? [`備考：${params.requestedNote}`] : []),
      `申請番号：${params.exchange.exchangeId}`,
      ...merchantLinkLines(params.exchange.exchangeId),
    ],
  );
}

/** 応答期限超過の merchant への督促（日次バッチ） */
export async function sendMerchantResponseReminderEmail(params: {
  config: ScheduleNotificationConfig;
  recipients: string[];
  exchange: ExchangeHistoryItem;
}) {
  await sendMail(
    params.config.region,
    params.recipients,
    "【コレクレ】お届け希望日への応答期限が過ぎています",
    [
      "ご担当者様",
      "",
      "従業員からのお届け希望日に、まだ応答がありません。",
      "このまま応答がない場合、交換は自動的にキャンセルされ、ポイントが従業員に返還されます。",
      "",
      `商品・サービス名：${params.exchange.merchandiseNameSnapshot}`,
      `申請番号：${params.exchange.exchangeId}`,
      ...merchantLinkLines(params.exchange.exchangeId),
    ],
  );
}

/** 日程確定時の両者への通知 */
export async function sendScheduleConfirmedEmails(params: {
  config: ScheduleNotificationConfig;
  merchantRecipients: string[];
  employeeRecipient?: string;
  exchange: ExchangeHistoryItem;
  arrivalDate: string;
  timeSlot?: string;
  shipDate?: string;
}) {
  const dateLabel = `${formatDateJa(params.arrivalDate)}${params.timeSlot ? ` ${params.timeSlot}` : ""}`;

  const results = await Promise.allSettled([
    sendMail(
      params.config.region,
      params.merchantRecipients,
      "【コレクレ】お届け日が確定しました",
      [
        "ご担当者様",
        "",
        `「${params.exchange.merchandiseNameSnapshot}」のお届け日が確定しました。`,
        "",
        `お届け日：${dateLabel}`,
        ...(params.shipDate ? [`発送日：${formatDateJa(params.shipDate)}`] : []),
        `申請番号：${params.exchange.exchangeId}`,
        ...merchantLinkLines(params.exchange.exchangeId),
      ],
    ),
    ...(params.employeeRecipient
      ? [
          sendMail(
            params.config.region,
            params.employeeRecipient,
            "【コレクレ】お届け日が確定しました",
            [
              `「${params.exchange.merchandiseNameSnapshot}」のお届け日が確定しました。`,
              "",
              `お届け日：${dateLabel}`,
              "前日にもリマインドをお送りします。確実にお受け取りください。",
              ...employeeLinkLines(params.exchange.exchangeId),
            ],
          ),
        ]
      : []),
  ]);

  const failed = results.find((result) => result.status === "rejected");
  if (failed && failed.status === "rejected") {
    throw failed.reason;
  }
}

/** merchant が希望日に対応できなかったときの employee への通知 */
export async function sendEmployeeRequestRejectedEmail(params: {
  config: ScheduleNotificationConfig;
  recipient: string;
  exchange: ExchangeHistoryItem;
  requestedArrivalDate?: string;
  reason: string;
}) {
  await sendMail(
    params.config.region,
    params.recipient,
    "【コレクレ】お届け希望日に対応できませんでした",
    [
      `「${params.exchange.merchandiseNameSnapshot}」の${params.requestedArrivalDate ? `お届け希望日（${formatDateJa(params.requestedArrivalDate)}）` : "お届け希望日"}に、提携企業が対応できませんでした。`,
      `理由：${params.reason}`,
      "",
      "提示済みの候補から選ぶ、別の日を希望する、または交換をキャンセル（ポイント全額返還）できます。",
      ...employeeLinkLines(params.exchange.exchangeId),
    ],
  );
}

/** 確定日前日の employee への受取リマインド（日次バッチ・受取失敗を防ぐ要） */
export async function sendEmployeeArrivalReminderEmail(params: {
  config: ScheduleNotificationConfig;
  recipient: string;
  exchange: ExchangeHistoryItem;
  arrivalDate: string;
  timeSlot?: string;
}) {
  await sendMail(
    params.config.region,
    params.recipient,
    "【コレクレ】明日は商品のお届け日です",
    [
      `「${params.exchange.merchandiseNameSnapshot}」が明日届きます。`,
      "",
      `お届け日：${formatDateJa(params.arrivalDate)}${params.timeSlot ? ` ${params.timeSlot}` : ""}`,
      "生鮮品の場合、受け取れなかった際のポイント返還・再送はできません。確実にお受け取りください。",
      ...employeeLinkLines(params.exchange.exchangeId),
    ],
  );
}

/** 期限切れ・上限到達などで自動キャンセルされたときの employee への通知（日次バッチ） */
export async function sendEmployeeScheduleCancelledEmail(params: {
  config: ScheduleNotificationConfig;
  recipient: string;
  exchange: ExchangeHistoryItem;
  refundPoint: number;
  reason: string;
}) {
  await sendMail(
    params.config.region,
    params.recipient,
    "【コレクレ】交換がキャンセルされ、ポイントを返還しました",
    [
      `「${params.exchange.merchandiseNameSnapshot}」の交換はキャンセルされました。`,
      `理由：${params.reason}`,
      "",
      `使用した ${params.refundPoint.toLocaleString("ja-JP")}pt は全額返還済みです。`,
      "改めて商品・サービスの交換をご利用いただけます。",
    ],
  );
}
