import "server-only";

import { randomUUID } from "node:crypto";

import { sendSesEmail } from "@correcre/lib/email/ses";
import {
  buildMerchantBroadcastSettingKey,
  listMerchantBroadcastLogs,
  putMerchantBroadcastLog,
} from "@correcre/lib/dynamodb/merchant-broadcast";
import { listMerchandiseByMerchant } from "@correcre/lib/dynamodb/merchandise";
import { listMerchants } from "@correcre/lib/dynamodb/merchant";
import { listMerchantUsersByMerchant } from "@correcre/lib/dynamodb/merchant-user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import {
  MERCHANT_BROADCAST_TARGET_STATUSES,
  buildMerchantBroadcastSubject,
  buildMerchantBroadcastText,
  getMerchantBroadcastMerchantName,
  mergeMerchantBroadcastRecipients,
  resolveMerchantBroadcastRecipients,
  type MerchantBroadcastRecipient,
} from "@correcre/lib/merchant-broadcast";
import { joinNameParts } from "@correcre/lib/user-profile";
import type { DBUserItem, Merchant, MerchantBroadcastLogItem } from "@correcre/types";

import type {
  MerchantBroadcastHistory,
  MerchantBroadcastPageData,
  MerchantBroadcastTarget,
  SendMerchantBroadcastInput,
  SendMerchantBroadcastResult,
} from "../model/types";

const DEFAULT_SES_FROM_EMAIL = "correcre-info@efficient-technology.com";
const HISTORY_LIMIT = 30;
// SES の送信レート（本番アカウントの既定は毎秒 14 通）を超えないよう、5 通ずつ 0.5 秒以上あけて送る
const SEND_BATCH_SIZE = 5;
const SEND_BATCH_INTERVAL_MS = 500;

function readOptionalServerEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function getRuntimeConfig() {
  return {
    region: readRequiredServerEnv("AWS_REGION"),
    merchantTableName: readRequiredServerEnv("DDB_MERCHANT_TABLE_NAME"),
    merchantUserTableName: readRequiredServerEnv("DDB_MERCHANT_USER_TABLE_NAME"),
    merchandiseTableName: readRequiredServerEnv("DDB_MERCHANDISE_TABLE_NAME"),
    systemSettingTableName: readRequiredServerEnv("DDB_SYSTEM_SETTING_TABLE_NAME"),
  };
}

function getMerchantAppUrl() {
  const baseUrl =
    readOptionalServerEnv("MERCHANT_APP_URL") ??
    (process.env.NODE_ENV === "development" ? "http://localhost:3003" : undefined);
  return baseUrl?.replace(/\/+$/, "");
}

function getSesFromEmail() {
  return readOptionalServerEnv("SES_FROM_EMAIL") ?? DEFAULT_SES_FROM_EMAIL;
}

function isBroadcastTargetMerchant(merchant: Merchant) {
  return MERCHANT_BROADCAST_TARGET_STATUSES.includes(merchant.status);
}

async function resolveRecipientsForMerchant(
  config: ReturnType<typeof getRuntimeConfig>,
  merchant: Merchant,
): Promise<MerchantBroadcastRecipient[]> {
  const users = await listMerchantUsersByMerchant(
    { region: config.region, tableName: config.merchantUserTableName },
    merchant.merchantId,
  );
  return resolveMerchantBroadcastRecipients(merchant, users);
}

function toHistory(item: MerchantBroadcastLogItem): MerchantBroadcastHistory {
  return {
    broadcastId: item.broadcastId,
    sentAt: item.sentAt,
    subject: item.subject,
    body: item.body,
    merchantNames: item.merchants.map((merchant) => merchant.merchantName),
    recipientCount: item.recipientCount,
    sentCount: item.sentCount,
    failedEmails: item.failedEmails ?? [],
    sentByName: item.sentBy.displayName || item.sentBy.email,
  };
}

export async function getMerchantBroadcastPageData(operator: DBUserItem): Promise<MerchantBroadcastPageData> {
  const config = getRuntimeConfig();
  const merchants = (await listMerchants({ region: config.region, tableName: config.merchantTableName }))
    .filter(isBroadcastTargetMerchant)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  const historyPromise = listMerchantBroadcastLogs({ region: config.region, tableName: config.systemSettingTableName })
    .then((items) => ({ history: items.slice(0, HISTORY_LIMIT).map(toHistory), historyUnavailable: false }))
    .catch((error: unknown) => {
      console.error("Failed to load merchant broadcast history", error);
      return { history: [] as MerchantBroadcastHistory[], historyUnavailable: true };
    });

  const targets = await Promise.all(
    merchants.map(async (merchant): Promise<MerchantBroadcastTarget> => {
      const [recipients, merchandise] = await Promise.all([
        resolveRecipientsForMerchant(config, merchant),
        listMerchandiseByMerchant({ region: config.region, tableName: config.merchandiseTableName }, merchant.merchantId),
      ]);

      return {
        merchantId: merchant.merchantId,
        merchantName: getMerchantBroadcastMerchantName(merchant),
        status: merchant.status,
        createdAt: merchant.createdAt,
        merchandiseCount: merchandise.length,
        publishedMerchandiseCount: merchandise.filter((item) => item.status === "PUBLISHED").length,
        recipients: recipients.map((recipient) => ({
          email: recipient.email,
          recipientName: recipient.recipientName,
          kind: recipient.kind,
          userStatus: recipient.userStatus,
        })),
      };
    }),
  );

  const { history, historyUnavailable } = await historyPromise;

  return {
    targets,
    history,
    historyUnavailable,
    merchantAppUrl: getMerchantAppUrl(),
    operatorEmail: operator.email,
  };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isThrottlingError(error: unknown) {
  const name = typeof error === "object" && error !== null ? (error as { name?: string }).name : undefined;
  return name === "TooManyRequestsException" || name === "ThrottlingException" || name === "Throttling";
}

async function sendOne(
  region: string,
  recipient: MerchantBroadcastRecipient,
  content: { subject: string; body: string; merchantAppUrl?: string },
) {
  const send = () =>
    sendSesEmail(
      { region, fromEmail: getSesFromEmail() },
      {
        // 他社のアドレスが見えないよう、宛先ごとに 1 通ずつ送る
        to: recipient.email,
        subject: buildMerchantBroadcastSubject({ subject: content.subject, recipient }),
        text: buildMerchantBroadcastText({ body: content.body, recipient, merchantAppUrl: content.merchantAppUrl }),
      },
    );

  try {
    await send();
  } catch (error) {
    if (!isThrottlingError(error)) {
      throw error;
    }
    await wait(1000);
    await send();
  }
}

export class MerchantBroadcastInputError extends Error {}

export async function sendMerchantBroadcast(
  operator: DBUserItem,
  input: SendMerchantBroadcastInput,
  options: { maxRecipients: number },
): Promise<SendMerchantBroadcastResult> {
  const config = getRuntimeConfig();
  const merchantAppUrl = getMerchantAppUrl();
  const requestedEmailsByMerchant = new Map<string, Set<string>>();
  for (const selection of input.selections) {
    const emails = requestedEmailsByMerchant.get(selection.merchantId) ?? new Set<string>();
    for (const email of selection.emails) {
      emails.add(email.trim().toLowerCase());
    }
    requestedEmailsByMerchant.set(selection.merchantId, emails);
  }
  const allMerchants = await listMerchants({ region: config.region, tableName: config.merchantTableName });
  // 選択順ではなく一覧と同じ並び（新しい順）で処理する
  const merchants = allMerchants
    .filter((merchant) => requestedEmailsByMerchant.has(merchant.merchantId) && isBroadcastTargetMerchant(merchant))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  if (!merchants.length) {
    throw new MerchantBroadcastInputError("送信先の提携企業が見つかりません。画面を再読み込みしてください。");
  }

  // 画面で選ばれたアドレスのうち、今もその提携企業の宛先であるものだけに送る
  // （任意のアドレスへ送れないよう、宛先はサーバー側で解決し直す）
  const recipientsByMerchant = await Promise.all(
    merchants.map(async (merchant) => {
      const requestedEmails = requestedEmailsByMerchant.get(merchant.merchantId) ?? new Set<string>();
      const recipients = await resolveRecipientsForMerchant(config, merchant);
      return recipients.filter((recipient) => requestedEmails.has(recipient.email));
    }),
  );
  const recipients = mergeMerchantBroadcastRecipients(recipientsByMerchant);
  // 履歴には実際に宛先が残った提携企業だけを記録する
  const sentMerchantIds = new Set(recipients.map((recipient) => recipient.merchantId));

  if (input.mode === "test") {
    // テスト送信: 先頭の宛先の内容で差し込んだメールを、操作中の運用者本人にだけ送る
    const sample = recipients[0] ?? {
      email: operator.email,
      merchantId: merchants[0].merchantId,
      merchantName: getMerchantBroadcastMerchantName(merchants[0]),
      recipientName: "ご担当者",
      kind: "contact" as const,
    };
    await sendOne(
      config.region,
      { ...sample, email: operator.email },
      { subject: `[テスト送信] ${input.subject}`, body: input.body, merchantAppUrl },
    );
    return { mode: "test", recipientCount: 1, sentCount: 1, failedEmails: [], historySaved: false };
  }

  if (!recipients.length) {
    throw new MerchantBroadcastInputError("選択した宛先に送信できるメールアドレスがありません。画面を再読み込みしてください。");
  }

  if (recipients.length > options.maxRecipients) {
    throw new MerchantBroadcastInputError(
      `1回に送信できるのは${options.maxRecipients}件までです（現在 ${recipients.length}件）。提携企業を分けて送信してください。`,
    );
  }

  const failedEmails: string[] = [];
  let sentCount = 0;

  for (let index = 0; index < recipients.length; index += SEND_BATCH_SIZE) {
    const batch = recipients.slice(index, index + SEND_BATCH_SIZE);
    const startedAt = Date.now();
    const results = await Promise.allSettled(
      batch.map((recipient) =>
        sendOne(config.region, recipient, { subject: input.subject, body: input.body, merchantAppUrl }),
      ),
    );

    results.forEach((result, resultIndex) => {
      if (result.status === "fulfilled") {
        sentCount += 1;
      } else {
        failedEmails.push(batch[resultIndex].email);
        console.error("Failed to send merchant broadcast email", {
          email: batch[resultIndex].email,
          error: result.reason,
        });
      }
    });

    const elapsed = Date.now() - startedAt;
    if (index + SEND_BATCH_SIZE < recipients.length && elapsed < SEND_BATCH_INTERVAL_MS) {
      await wait(SEND_BATCH_INTERVAL_MS - elapsed);
    }
  }

  const sentAt = new Date().toISOString();
  const broadcastId = randomUUID();
  const logItem: MerchantBroadcastLogItem = {
    settingKey: buildMerchantBroadcastSettingKey(sentAt, broadcastId),
    broadcastId,
    sentAt,
    subject: input.subject,
    body: input.body,
    merchants: merchants
      .filter((merchant) => sentMerchantIds.has(merchant.merchantId))
      .map((merchant) => ({
        merchantId: merchant.merchantId,
        merchantName: getMerchantBroadcastMerchantName(merchant),
      })),
    recipientCount: recipients.length,
    sentCount,
    failedEmails,
    sentBy: {
      userId: operator.userId,
      email: operator.email,
      displayName: joinNameParts(operator.lastName, operator.firstName) || undefined,
    },
  };

  let historySaved = true;
  try {
    await putMerchantBroadcastLog({ region: config.region, tableName: config.systemSettingTableName }, logItem);
  } catch (error) {
    historySaved = false;
    console.error("Failed to save merchant broadcast history", error, { broadcastId });
  }

  return {
    mode: "send",
    recipientCount: recipients.length,
    sentCount,
    failedEmails,
    historySaved,
    history: historySaved ? toHistory(logItem) : undefined,
  };
}
