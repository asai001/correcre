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
import {
  getMerchandise,
  listMerchandiseByStatus,
} from "@correcre/lib/dynamodb/merchandise";
import { getUserByCompanyAndUserId } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { createMerchandiseImageViewUrl } from "@correcre/lib/s3/merchandise-image";
import {
  toPublicMerchandiseSummary,
  type PublicMerchandiseDetail,
  type PublicMerchandiseSummary,
} from "@correcre/merchandise-public";
import type {
  ExchangeHistoryItem,
  ExchangeHistoryStatusEvent,
  Merchandise,
} from "@correcre/types";

import type { RequestExchangeResponse } from "../model/types";

type RuntimeConfig = {
  region: string;
  merchandiseTableName: string;
  merchantTableName: string;
  merchandiseImageBucketName: string;
  exchangeHistoryTableName: string;
  userTableName: string;
};

function getRuntimeConfig(): RuntimeConfig {
  return {
    region: readRequiredServerEnv("AWS_REGION"),
    merchandiseTableName: readRequiredServerEnv("DDB_MERCHANDISE_TABLE_NAME"),
    merchantTableName: readRequiredServerEnv("DDB_MERCHANT_TABLE_NAME"),
    merchandiseImageBucketName: readRequiredServerEnv("S3_MERCHANDISE_IMAGE_BUCKET_NAME"),
    exchangeHistoryTableName: readRequiredServerEnv("DDB_EXCHANGE_HISTORY_TABLE_NAME"),
    userTableName: readRequiredServerEnv("DDB_USER_TABLE_NAME"),
  };
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
  const name = merchant?.name ?? "";
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

  const currentBalance = user.currentPointBalance ?? 0;

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
        expectedCurrentPointBalance: currentBalance,
        nextCurrentPointBalance: nextBalance,
        updatedAt: now,
      },
    },
  );

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
