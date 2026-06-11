import "server-only";

import { listExchangeHistoryByMerchant } from "@correcre/lib/dynamodb/exchange-history";
import { listMerchandiseByMerchant } from "@correcre/lib/dynamodb/merchandise";
import { getMerchantById, listMerchants } from "@correcre/lib/dynamodb/merchant";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { POINT_YEN_VALUE } from "@correcre/lib/points";
import { createMerchandiseImageViewUrl } from "@correcre/lib/s3/merchandise-image";
import type { ExchangeHistoryItem, ExchangeHistoryStatus, Merchant } from "@correcre/types";

import type { MerchantStats, OperatorMerchandiseSummary } from "../model/types";

type RuntimeConfig = {
  region: string;
  merchantTableName: string;
  merchandiseTableName: string;
  exchangeHistoryTableName: string;
  merchandiseImageBucketName: string;
};

function getRuntimeConfig(): RuntimeConfig {
  return {
    region: readRequiredServerEnv("AWS_REGION"),
    merchantTableName: readRequiredServerEnv("DDB_MERCHANT_TABLE_NAME"),
    merchandiseTableName: readRequiredServerEnv("DDB_MERCHANDISE_TABLE_NAME"),
    exchangeHistoryTableName: readRequiredServerEnv("DDB_EXCHANGE_HISTORY_TABLE_NAME"),
    merchandiseImageBucketName: readRequiredServerEnv("S3_MERCHANDISE_IMAGE_BUCKET_NAME"),
  };
}

function normalizeExchangeStatus(value?: ExchangeHistoryStatus): ExchangeHistoryStatus {
  if (!value) return "REQUESTED";
  if (value === "CANCELLED") return "CANCELED";
  return value;
}

// 却下・キャンセル以外は「成立した交換」としてポイントを消費したとみなす。
function isExchangeConsumed(status: ExchangeHistoryStatus): boolean {
  return status !== "REJECTED" && status !== "CANCELED";
}

// 準備中・対応中は「対応中の商品」とみなす。
function isExchangeInProgress(status: ExchangeHistoryStatus): boolean {
  return status === "PREPARING" || status === "IN_PROGRESS";
}

function buildMerchantStats(
  merchantId: string,
  merchandise: Awaited<ReturnType<typeof listMerchandiseByMerchant>>,
  exchanges: ExchangeHistoryItem[],
): MerchantStats {
  let publishedCount = 0;
  let unpublishedCount = 0;

  for (const item of merchandise) {
    if (item.status === "PUBLISHED") {
      publishedCount += 1;
    } else {
      // UNPUBLISHED と DRAFT はいずれも非公開として数える。
      unpublishedCount += 1;
    }
  }

  let inProgressCount = 0;
  let totalExchangeCount = 0;
  let totalPoint = 0;

  for (const exchange of exchanges) {
    const status = normalizeExchangeStatus(exchange.status);
    if (isExchangeInProgress(status)) {
      inProgressCount += 1;
    }
    if (isExchangeConsumed(status)) {
      totalExchangeCount += 1;
      totalPoint += exchange.usedPoint ?? 0;
    }
  }

  return {
    merchantId,
    publishedCount,
    unpublishedCount,
    inProgressCount,
    totalExchangeCount,
    totalAmountYen: totalPoint * POINT_YEN_VALUE,
  };
}

async function computeMerchantStats(config: RuntimeConfig, merchantId: string): Promise<MerchantStats> {
  const [merchandise, exchanges] = await Promise.all([
    listMerchandiseByMerchant({ region: config.region, tableName: config.merchandiseTableName }, merchantId),
    listExchangeHistoryByMerchant(
      { region: config.region, tableName: config.exchangeHistoryTableName },
      merchantId,
    ),
  ]);

  return buildMerchantStats(merchantId, merchandise, exchanges);
}

// 提携企業ごとの商品・交換集計（提携企業管理リスト用）。
export async function listMerchantStatsForOperator(): Promise<MerchantStats[]> {
  const config = getRuntimeConfig();
  const merchants: Merchant[] = await listMerchants({
    region: config.region,
    tableName: config.merchantTableName,
  });

  return Promise.all(merchants.map((merchant) => computeMerchantStats(config, merchant.merchantId)));
}

// 指定した提携企業が登録した商品の一覧（運用者の確認画面用）。
export async function listMerchandiseForOperator(
  merchantId: string,
): Promise<OperatorMerchandiseSummary[]> {
  const config = getRuntimeConfig();
  const merchandise = await listMerchandiseByMerchant(
    { region: config.region, tableName: config.merchandiseTableName },
    merchantId,
  );

  const summaries = await Promise.all(
    merchandise.map(async (item): Promise<OperatorMerchandiseSummary> => {
      const imageConfig = {
        region: config.region,
        bucketName: config.merchandiseImageBucketName,
      };

      const [cardImage, detailImage] = await Promise.all([
        item.cardImage ? createMerchandiseImageViewUrl(imageConfig, item.cardImage.s3Key) : null,
        item.detailImage ? createMerchandiseImageViewUrl(imageConfig, item.detailImage.s3Key) : null,
      ]);

      return {
        ...item,
        cardImageViewUrl: cardImage?.url,
        detailImageViewUrl: detailImage?.url,
      };
    }),
  );

  // 新しい順（作成日時の降順）に並べる。
  return summaries.sort((left, right) => (right.createdAt ?? "").localeCompare(left.createdAt ?? ""));
}

export async function getMerchantForOperator(merchantId: string): Promise<Merchant | null> {
  const config = getRuntimeConfig();
  return getMerchantById({ region: config.region, tableName: config.merchantTableName }, merchantId);
}
