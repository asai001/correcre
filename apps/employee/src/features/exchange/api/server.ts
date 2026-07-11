import "server-only";

import { randomUUID } from "node:crypto";

import {
  buildExchangeHistoryByCompanyGsiPk,
  buildExchangeHistoryByCompanyGsiSk,
  buildExchangeHistoryByMerchantGsiPk,
  buildExchangeHistoryByMerchantGsiSk,
  buildExchangeHistoryByMerchantStatusGsiPk,
  buildExchangeHistoryPk,
  buildExchangeHistorySk,
  InsufficientPointBalanceError,
  putExchangeHistoryWithReservation,
} from "@correcre/lib/dynamodb/exchange-history";
import { getMerchantById } from "@correcre/lib/dynamodb/merchant";
import { listMerchantUsersByMerchant } from "@correcre/lib/dynamodb/merchant-user";
import { createPointTransaction } from "@correcre/lib/dynamodb/point-transaction";
import {
  getMerchandise,
  listMerchandiseByStatus,
} from "@correcre/lib/dynamodb/merchandise";
import { sendSesEmail } from "@correcre/lib/email/ses";
import { getUserByCompanyAndUserId } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { createMerchandiseImageViewUrl } from "@correcre/lib/s3/merchandise-image";
import { hasCompleteExchangeRequestProfile } from "@correcre/lib/user-profile";
import { reflectPoints } from "@correcre/lib/points-reflection";
import {
  toPublicMerchandiseSummary,
  type PublicMerchandiseDetail,
  type PublicMerchandiseSummary,
} from "@correcre/merchandise-public";
import type {
  ExchangeHistoryItem,
  ExchangeHistoryStatusEvent,
  Merchant,
  Merchandise,
} from "@correcre/types";

import type { RequestExchangeResponse } from "../model/types";

type RuntimeConfig = {
  region: string;
  merchandiseTableName: string;
  merchantTableName: string;
  merchantUserTableName?: string;
  merchandiseImageBucketName: string;
  exchangeHistoryTableName: string;
  pointTransactionTableName: string;
  userTableName: string;
};

const DEFAULT_SES_FROM_EMAIL = "correcre-info@efficient-technology.com";
const MERCHANT_EXCHANGE_REQUEST_SUBJECT = "【コレクレ】商品・サービス交換申請のご確認依頼";
const NOTIFIABLE_MERCHANT_USER_STATUSES = new Set(["INVITED", "ACTIVE"]);
const EXCHANGE_POINT_YEN_VALUE = 5;

function getRuntimeConfig(): RuntimeConfig {
  return {
    region: readRequiredServerEnv("AWS_REGION"),
    merchandiseTableName: readRequiredServerEnv("DDB_MERCHANDISE_TABLE_NAME"),
    merchantTableName: readRequiredServerEnv("DDB_MERCHANT_TABLE_NAME"),
    merchantUserTableName: readOptionalServerEnv("DDB_MERCHANT_USER_TABLE_NAME"),
    merchandiseImageBucketName: readRequiredServerEnv("S3_MERCHANDISE_IMAGE_BUCKET_NAME"),
    exchangeHistoryTableName: readRequiredServerEnv("DDB_EXCHANGE_HISTORY_TABLE_NAME"),
    pointTransactionTableName: readRequiredServerEnv("DDB_POINT_TRANSACTION_TABLE_NAME"),
    userTableName: readRequiredServerEnv("DDB_USER_TABLE_NAME"),
  };
}

function readOptionalServerEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function resolveMerchantAppUrl() {
  const configuredUrl = readOptionalServerEnv("MERCHANT_APP_URL");
  if (configuredUrl) {
    return normalizeBaseUrl(configuredUrl);
  }

  return process.env.NODE_ENV === "development" ? "http://localhost:3003" : undefined;
}

function formatApplicationDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("ja-JP").format(value);
}

function normalizeEmailAddress(value?: string) {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : undefined;
}

async function resolveMerchantNotificationRecipients(
  config: RuntimeConfig,
  merchant: Merchant | null,
): Promise<string[]> {
  const contactEmail = normalizeEmailAddress(merchant?.contactEmail);
  if (contactEmail) {
    return [contactEmail];
  }

  if (!merchant) {
    return [];
  }

  if (!config.merchantUserTableName) {
    console.warn("Skipped merchant user email fallback because DDB_MERCHANT_USER_TABLE_NAME is not set.", {
      merchantId: merchant.merchantId,
    });
    return [];
  }

  const users = await listMerchantUsersByMerchant(
    {
      region: config.region,
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

function buildMerchantExchangeRequestEmailBody(params: {
  merchantName: string;
  merchandiseName: string;
  requestedAt: string;
  usedPoint: number;
  exchangeId: string;
  detailUrl: string;
}) {
  const exchangeAmountYen = params.usedPoint * EXCHANGE_POINT_YEN_VALUE;
  const greeting = params.merchantName ? `${params.merchantName}\nご担当者様` : "ご担当者様";

  return `${greeting}

平素よりコレクレをご利用いただきありがとうございます。

コレクレにて、貴社の商品・サービスに対するポイント交換申請がありました。
以下の内容をご確認のうえ、ご対応をお願いいたします。

商品・サービス名：${params.merchandiseName}
申請日時：${formatApplicationDateTime(params.requestedAt)}
交換ポイント数：${formatInteger(params.usedPoint)} pt
交換相当額：${formatInteger(exchangeAmountYen)}円
申請番号：${params.exchangeId}

申請内容の確認はこちら：
${params.detailUrl}

本メールはシステムより自動送信されています。`;
}

async function notifyMerchantExchangeRequested(params: {
  config: RuntimeConfig;
  merchant: Merchant | null;
  exchange: ExchangeHistoryItem;
}) {
  const recipients = await resolveMerchantNotificationRecipients(params.config, params.merchant);
  if (!recipients.length) {
    console.warn("Skipped merchant exchange request notification because no recipient was found.", {
      exchangeId: params.exchange.exchangeId,
      merchantId: params.exchange.merchantId,
    });
    return;
  }

  const merchantAppUrl = resolveMerchantAppUrl();
  if (!merchantAppUrl) {
    throw new Error("MERCHANT_APP_URL is not set.");
  }

  const detailUrl = `${merchantAppUrl}/exchanges/${encodeURIComponent(params.exchange.exchangeId)}`;
  const text = buildMerchantExchangeRequestEmailBody({
    merchantName: params.merchant?.name ?? params.exchange.merchantNameSnapshot ?? "",
    merchandiseName: params.exchange.merchandiseNameSnapshot,
    requestedAt: params.exchange.requestedAt ?? params.exchange.exchangedAt,
    usedPoint: params.exchange.usedPoint,
    exchangeId: params.exchange.exchangeId,
    detailUrl,
  });

  await sendSesEmail(
    {
      region: params.config.region,
      fromEmail: readOptionalServerEnv("SES_FROM_EMAIL") ?? DEFAULT_SES_FROM_EMAIL,
    },
    {
      to: recipients,
      subject: MERCHANT_EXCHANGE_REQUEST_SUBJECT,
      text,
    },
  );
}

async function buildImageUrls(
  config: RuntimeConfig,
  merchandise: Merchandise,
): Promise<{ cardImageViewUrl?: string; detailImageViewUrl?: string }> {
  const result: { cardImageViewUrl?: string; detailImageViewUrl?: string } = {};

  if (merchandise.cardImage) {
    const { url } = await createMerchandiseImageViewUrl(
      {
        region: config.region,
        bucketName: config.merchandiseImageBucketName,
      },
      merchandise.cardImage.s3Key,
    );
    result.cardImageViewUrl = url;
  }

  if (merchandise.detailImage) {
    const { url } = await createMerchandiseImageViewUrl(
      {
        region: config.region,
        bucketName: config.merchandiseImageBucketName,
      },
      merchandise.detailImage.s3Key,
    );
    result.detailImageViewUrl = url;
  }

  return result;
}

async function resolveMerchantName(
  config: RuntimeConfig,
  merchantId: string,
  cache: Map<string, string>,
): Promise<string> {
  const cached = cache.get(merchantId);
  if (cached !== undefined) {
    return cached;
  }

  const merchant = await getMerchantById(
    {
      region: config.region,
      tableName: config.merchantTableName,
    },
    merchantId,
  );
  // 表示名（任意）を優先し、未設定なら会社名にフォールバックする。
  const name = merchant?.displayName?.trim() || merchant?.name || "";
  cache.set(merchantId, name);
  return name;
}

export async function listPublishedMerchandiseForEmployee(): Promise<PublicMerchandiseSummary[]> {
  const config = getRuntimeConfig();
  const items = await listMerchandiseByStatus(
    {
      region: config.region,
      tableName: config.merchandiseTableName,
    },
    "PUBLISHED",
  );

  const merchantNameCache = new Map<string, string>();
  const summaries: PublicMerchandiseSummary[] = [];

  for (const item of items) {
    const [imageUrls, merchantName] = await Promise.all([
      buildImageUrls(config, item),
      resolveMerchantName(config, item.merchantId, merchantNameCache),
    ]);
    summaries.push(toPublicMerchandiseSummary(item, merchantName, imageUrls));
  }

  return summaries.sort((left, right) => {
    const leftDate = left.publishDate ?? "";
    const rightDate = right.publishDate ?? "";
    if (leftDate !== rightDate) {
      return leftDate < rightDate ? 1 : -1;
    }
    return left.merchandiseId < right.merchandiseId ? 1 : -1;
  });
}

export async function getPublishedMerchandiseDetail(
  merchantId: string,
  merchandiseId: string,
): Promise<PublicMerchandiseDetail | null> {
  const config = getRuntimeConfig();
  const merchandise = await getMerchandise(
    {
      region: config.region,
      tableName: config.merchandiseTableName,
    },
    merchantId,
    merchandiseId,
  );

  if (!merchandise || merchandise.status !== "PUBLISHED") {
    return null;
  }

  const [imageUrls, merchantNameMap] = await Promise.all([
    buildImageUrls(config, merchandise),
    (async () => {
      const cache = new Map<string, string>();
      await resolveMerchantName(config, merchandise.merchantId, cache);
      return cache;
    })(),
  ]);

  return toPublicMerchandiseSummary(
    merchandise,
    merchantNameMap.get(merchandise.merchantId) ?? "",
    imageUrls,
  );
}

export async function requestExchangeForEmployee(params: {
  companyId: string;
  userId: string;
  merchantId: string;
  merchandiseId: string;
}): Promise<RequestExchangeResponse> {
  const config = getRuntimeConfig();

  const [user, merchandise] = await Promise.all([
    getUserByCompanyAndUserId(
      {
        region: config.region,
        tableName: config.userTableName,
      },
      params.companyId,
      params.userId,
    ),
    getMerchandise(
      {
        region: config.region,
        tableName: config.merchandiseTableName,
      },
      params.merchantId,
      params.merchandiseId,
    ),
  ]);

  if (!user || user.status === "DELETED") {
    throw new Error("ユーザーが見つかりません");
  }

  if (!merchandise || merchandise.status !== "PUBLISHED") {
    throw new MerchandiseUnavailableError("対象の商品は現在交換できません");
  }

  if (!Number.isFinite(merchandise.requiredPoint) || merchandise.requiredPoint <= 0) {
    throw new MerchandiseUnavailableError("商品の必要ポイントが正しく設定されていません");
  }

  // 翌月反映を読み取り時に適用し、利用可能（反映済み）残高で判定・消費する。今月の未反映分は使えない。
  const reflected = reflectPoints(user);
  const currentBalance = reflected.spendablePoint;
  if (!hasCompleteExchangeRequestProfile({ phoneNumber: user.phoneNumber, address: user.address })) {
    throw new IncompleteExchangeProfileError(
      "郵便番号・都道府県・市区町村・丁目/番地・電話番号を登録してから申請してください",
    );
  }

  if (currentBalance < merchandise.requiredPoint) {
    throw new InsufficientPointBalanceError("ポイント残高が不足しています");
  }

  const merchant = await getMerchantById(
    {
      region: config.region,
      tableName: config.merchantTableName,
    },
    merchandise.merchantId,
  );

  const now = new Date().toISOString();
  const exchangeId = randomUUID();
  const exchangedAt = now;
  const requiredPoint = merchandise.requiredPoint;
  const nextBalance = currentBalance - requiredPoint;

  const initialEvent: ExchangeHistoryStatusEvent = {
    status: "REQUESTED",
    occurredAt: now,
    actorType: "EMPLOYEE",
    actorId: params.userId,
  };

  const exchange: ExchangeHistoryItem = {
    pk: buildExchangeHistoryPk(params.companyId, params.userId),
    sk: buildExchangeHistorySk(exchangedAt, exchangeId),
    exchangeId,
    companyId: params.companyId,
    userId: params.userId,
    merchandiseId: merchandise.merchandiseId,
    merchandiseNameSnapshot: merchandise.merchandiseName,
    merchantId: merchandise.merchantId,
    merchantNameSnapshot: merchant?.name ?? undefined,
    usedPoint: requiredPoint,
    requiredPointSnapshot: requiredPoint,
    priceYenSnapshot: merchandise.priceYen,
    pointHeld: requiredPoint,
    status: "REQUESTED",
    history: [initialEvent],
    exchangedAt,
    requestedAt: now,
    createdAt: now,
    updatedAt: now,
    gsi1pk: buildExchangeHistoryByCompanyGsiPk(params.companyId),
    gsi1sk: buildExchangeHistoryByCompanyGsiSk(exchangedAt, params.userId, exchangeId),
    gsi2pk: buildExchangeHistoryByMerchantStatusGsiPk(merchandise.merchantId, "REQUESTED"),
    gsi2sk: buildExchangeHistoryByMerchantGsiSk(exchangedAt, exchangeId),
    gsi3pk: buildExchangeHistoryByMerchantGsiPk(merchandise.merchantId),
    gsi3sk: buildExchangeHistoryByMerchantGsiSk(exchangedAt, exchangeId),
  };

  await putExchangeHistoryWithReservation(
    {
      region: config.region,
      tableName: config.exchangeHistoryTableName,
    },
    {
      exchange,
      user: {
        tableName: config.userTableName,
        companyId: params.companyId,
        userId: params.userId,
        // 条件式は DB の現在値（反映前の保存値）と照合する。
        expectedCurrentPointBalance: user.currentPointBalance ?? 0,
        // nextBalance は「反映後の利用可能残高 − 必要ポイント」。反映分もこの1更新でまとめて確定する。
        nextCurrentPointBalance: nextBalance,
        updatedAt: now,
        // pending を書き換える際の楽観ロック用に、読み込み時点の pending 状態を渡す。
        expectedPendingPointBalance: user.pendingPointBalance,
        expectedPendingPointYearMonth: user.pendingPointYearMonth,
        // 反映が発生した場合は pending を 0 にし、年月マーカーを削除する。
        ...(reflected.changed ? { nextPendingPointBalance: 0, clearPendingPointYearMonth: true } : {}),
      },
      pointTransaction: {
        tableName: config.pointTransactionTableName,
        transaction: createPointTransaction({
          companyId: params.companyId,
          userId: params.userId,
          transactionId: randomUUID(),
          occurredAt: now,
          type: "EXCHANGE_REQUEST",
          deltaPoint: -requiredPoint,
          balanceAfter: nextBalance,
          sourceType: "EXCHANGE_HISTORY",
          sourceId: exchangeId,
          actorType: "EMPLOYEE",
          actorUserId: params.userId,
          description: merchandise.merchandiseName,
        }),
      },
    },
  );

  try {
    await notifyMerchantExchangeRequested({
      config,
      merchant,
      exchange,
    });
  } catch (error) {
    console.error("Failed to send merchant exchange request notification.", {
      error,
      exchangeId,
      merchantId: merchandise.merchantId,
    });
  }

  return {
    exchangeId,
    status: "REQUESTED",
    merchandiseId: merchandise.merchandiseId,
    merchantId: merchandise.merchantId,
    usedPoint: requiredPoint,
    pointHeld: requiredPoint,
    exchangedAt,
    currentPointBalance: nextBalance,
  };
}

export class MerchandiseUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MerchandiseUnavailableError";
  }
}

export class IncompleteExchangeProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IncompleteExchangeProfileError";
  }
}
