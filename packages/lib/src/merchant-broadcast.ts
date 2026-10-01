// 運用者画面から提携企業へ送る一斉メールの共通ロジック（宛先の解決・差し込み文字の置換・本文の組み立て）。
// 運用者画面のプレビュー（クライアント）と送信 API（サーバー）の両方から使うため、server-only に依存させない。

import type { Merchant, MerchantStatus, MerchantUserItem, MerchantUserStatus } from "@correcre/types";

export const MERCHANT_BROADCAST_SUBJECT_MAX_LENGTH = 100;
export const MERCHANT_BROADCAST_BODY_MAX_LENGTH = 10000;
// 1 回の送信で送れる宛先数の上限（送信 API の実行時間に収めるため）
export const MERCHANT_BROADCAST_MAX_RECIPIENTS = 300;

export const MERCHANT_BROADCAST_PLACEHOLDERS = {
  merchantName: "{{提携企業名}}",
  recipientName: "{{担当者名}}",
} as const;

// 一斉メールの送信対象にできる提携企業のステータス（却下済みは対象外）
export const MERCHANT_BROADCAST_TARGET_STATUSES: readonly MerchantStatus[] = ["ACTIVE", "PENDING", "INACTIVE"];

// 宛先に含める提携企業ユーザーのステータス（停止・削除済みは送らない）
const RECIPIENT_USER_STATUSES: ReadonlySet<MerchantUserStatus> = new Set(["ACTIVE", "INVITED", "PENDING"]);

const DEFAULT_RECIPIENT_NAME = "ご担当者";

export type MerchantBroadcastRecipient = {
  email: string;
  merchantId: string;
  merchantName: string;
  recipientName: string;
  // user: 提携企業のログインユーザー / contact: 提携企業に登録された連絡先メールアドレス
  kind: "user" | "contact";
  userStatus?: MerchantUserStatus;
};

export function getMerchantBroadcastMerchantName(merchant: Pick<Merchant, "merchantId" | "name" | "displayName">) {
  return merchant.displayName?.trim() || merchant.name.trim() || merchant.merchantId;
}

function normalizeEmail(email: string | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

/**
 * 提携企業 1 社ぶんの宛先を返す。
 * 停止・削除済みでない提携企業ユーザー全員と、提携企業に登録された連絡先メールアドレスが対象。
 * 同じアドレスは 1 件にまとめる（ユーザーとしての登録を優先し、氏名を差し込みに使う）。
 */
export function resolveMerchantBroadcastRecipients(
  merchant: Pick<Merchant, "merchantId" | "name" | "displayName" | "contactEmail" | "contactPersonName">,
  users: readonly Pick<MerchantUserItem, "email" | "lastName" | "firstName" | "status">[],
): MerchantBroadcastRecipient[] {
  const merchantName = getMerchantBroadcastMerchantName(merchant);
  const recipients = new Map<string, MerchantBroadcastRecipient>();

  for (const user of users) {
    const email = normalizeEmail(user.email);
    if (!email || !RECIPIENT_USER_STATUSES.has(user.status) || recipients.has(email)) {
      continue;
    }

    recipients.set(email, {
      email,
      merchantId: merchant.merchantId,
      merchantName,
      recipientName: [user.lastName?.trim(), user.firstName?.trim()].filter(Boolean).join(" ") || DEFAULT_RECIPIENT_NAME,
      kind: "user",
      userStatus: user.status,
    });
  }

  const contactEmail = normalizeEmail(merchant.contactEmail);
  if (contactEmail && !recipients.has(contactEmail)) {
    recipients.set(contactEmail, {
      email: contactEmail,
      merchantId: merchant.merchantId,
      merchantName,
      recipientName: merchant.contactPersonName?.trim() || DEFAULT_RECIPIENT_NAME,
      kind: "contact",
    });
  }

  return [...recipients.values()];
}

/**
 * 複数社の宛先を 1 つにまとめる。
 * 同じアドレスが複数の提携企業に登録されている場合は、先に出てきた提携企業ぶんの 1 通だけ送る。
 */
export function mergeMerchantBroadcastRecipients(
  recipientsByMerchant: readonly (readonly MerchantBroadcastRecipient[])[],
): MerchantBroadcastRecipient[] {
  const merged = new Map<string, MerchantBroadcastRecipient>();

  for (const recipients of recipientsByMerchant) {
    for (const recipient of recipients) {
      if (!merged.has(recipient.email)) {
        merged.set(recipient.email, recipient);
      }
    }
  }

  return [...merged.values()];
}

export function applyMerchantBroadcastPlaceholders(
  template: string,
  recipient: Pick<MerchantBroadcastRecipient, "merchantName" | "recipientName">,
) {
  return template
    .split(MERCHANT_BROADCAST_PLACEHOLDERS.merchantName)
    .join(recipient.merchantName)
    .split(MERCHANT_BROADCAST_PLACEHOLDERS.recipientName)
    .join(recipient.recipientName);
}

export function buildMerchantBroadcastFooter(merchantAppUrl?: string) {
  const lines = [
    "――――――――――――――――――――",
    "本メールは、コレクレに提携企業としてご登録いただいている皆様へお送りしています。",
  ];

  if (merchantAppUrl) {
    lines.push("", "提携企業向け画面:", merchantAppUrl);
  }

  lines.push("", "コレクレ 運営事務局");

  return lines.join("\n");
}

export function buildMerchantBroadcastText(params: {
  body: string;
  recipient: Pick<MerchantBroadcastRecipient, "merchantName" | "recipientName">;
  merchantAppUrl?: string;
}) {
  const body = applyMerchantBroadcastPlaceholders(params.body, params.recipient).replace(/\s+$/, "");
  return `${body}\n\n${buildMerchantBroadcastFooter(params.merchantAppUrl)}`;
}

export function buildMerchantBroadcastSubject(params: {
  subject: string;
  recipient: Pick<MerchantBroadcastRecipient, "merchantName" | "recipientName">;
}) {
  // 件名に改行が入るとメールヘッダーが壊れるため 1 行にする
  return applyMerchantBroadcastPlaceholders(params.subject, params.recipient).replace(/[\r\n]+/g, " ").trim();
}
