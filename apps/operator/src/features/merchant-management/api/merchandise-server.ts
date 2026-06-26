import "server-only";

import {
  calculateExchangeFeeYen,
  calculateMerchantInvoiceYen,
  resolveExchangeFeePercent,
} from "@correcre/lib/billing";
import { listExchangeHistoryByMerchant } from "@correcre/lib/dynamodb/exchange-history";
import { listMerchandiseByMerchant } from "@correcre/lib/dynamodb/merchandise";
import { getMerchantById, listMerchants } from "@correcre/lib/dynamodb/merchant";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { POINT_YEN_VALUE } from "@correcre/lib/points";
import { createMerchandiseImageViewUrl } from "@correcre/lib/s3/merchandise-image";
import type { ExchangeHistoryItem, ExchangeHistoryStatus, Merchant } from "@correcre/types";

import type {
  MerchantMonthlyFinanceItemRow,
  MerchantMonthlyFinanceRow,
  MerchantOverallStats,
  MerchantOverallSummary,
  MerchantStats,
  MerchantSummaryDetail,
  OperatorMerchandiseSummary,
} from "../model/types";

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
  exchangeFeePercent: number,
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

  const totalAmountYen = totalPoint * POINT_YEN_VALUE;

  return {
    merchantId,
    publishedCount,
    unpublishedCount,
    inProgressCount,
    totalExchangeCount,
    totalAmountYen,
    totalExchangeFeeYen: calculateExchangeFeeYen(totalAmountYen, exchangeFeePercent),
    totalPayableYen: calculateMerchantInvoiceYen(totalAmountYen, exchangeFeePercent),
  };
}

// サマリー画面で表示する月数（直近 N か月）。収支ダッシュボードと揃える。
const MONTH_WINDOW = 12;

// 直近 N か月の YYYY-MM を新しい月が先頭になる順で返す。
function buildRecentMonths(count: number): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let offset = 0; offset < count; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

function buildMerchantMonthlyFinance(
  exchanges: ExchangeHistoryItem[],
  exchangeFeePercent: number,
): MerchantMonthlyFinanceRow[] {
  const byMonth = new Map<
    string,
    {
      salesYen: number;
      count: number;
      itemsByMerchandise: Map<string, MerchantMonthlyFinanceItemRow>;
    }
  >();

  for (const exchange of exchanges) {
    const status = normalizeExchangeStatus(exchange.status);
    if (!isExchangeConsumed(status)) {
      continue;
    }
    const month = exchange.exchangedAt.slice(0, 7);
    const entry = byMonth.get(month) ?? { salesYen: 0, count: 0, itemsByMerchandise: new Map() };
    const salesYen = (exchange.usedPoint ?? 0) * POINT_YEN_VALUE;
    const merchandiseId = exchange.merchandiseId ?? `unknown:${exchange.merchandiseNameSnapshot}`;
    const merchandiseName = exchange.merchandiseNameSnapshot || exchange.merchandiseId || "未設定";
    const item = entry.itemsByMerchandise.get(merchandiseId) ?? {
      merchandiseId,
      merchandiseName,
      exchangeCount: 0,
      salesYen: 0,
    };

    entry.salesYen += salesYen;
    entry.count += 1;
    item.exchangeCount += 1;
    item.salesYen += salesYen;
    entry.itemsByMerchandise.set(merchandiseId, item);
    byMonth.set(month, entry);
  }

  return buildRecentMonths(MONTH_WINDOW).map((month) => {
    const entry = byMonth.get(month);
    const salesYen = entry?.salesYen ?? 0;
    return {
      month,
      exchangeCount: entry?.count ?? 0,
      salesYen,
      exchangeFeeYen: calculateExchangeFeeYen(salesYen, exchangeFeePercent),
      payableYen: calculateMerchantInvoiceYen(salesYen, exchangeFeePercent),
      items: entry
        ? Array.from(entry.itemsByMerchandise.values()).sort(
            (left, right) => right.salesYen - left.salesYen || right.exchangeCount - left.exchangeCount,
          )
        : [],
    };
  });
}

async function buildMerchantSummaryDetail(
  config: RuntimeConfig,
  merchant: Merchant,
): Promise<MerchantSummaryDetail> {
  const [merchandise, exchanges] = await Promise.all([
    listMerchandiseByMerchant(
      { region: config.region, tableName: config.merchandiseTableName },
      merchant.merchantId,
    ),
    listExchangeHistoryByMerchant(
      { region: config.region, tableName: config.exchangeHistoryTableName },
      merchant.merchantId,
    ),
  ]);

  const exchangeFeePercent = resolveExchangeFeePercent(merchant.exchangeFeePercent);

  return {
    merchantId: merchant.merchantId,
    merchantName: merchant.name,
    status: merchant.status,
    exchangeFeePercent,
    stats: buildMerchantStats(merchant.merchantId, merchandise, exchanges, exchangeFeePercent),
    monthly: buildMerchantMonthlyFinance(exchanges, exchangeFeePercent),
  };
}

function buildOverallStats(merchants: Merchant[], summaries: MerchantSummaryDetail[]): MerchantOverallStats {
  const registeredMerchants = merchants.filter((merchant) => merchant.status !== "PENDING");

  return summaries.reduce<MerchantOverallStats>(
    (stats, summary) => ({
      ...stats,
      publishedCount: stats.publishedCount + summary.stats.publishedCount,
      unpublishedCount: stats.unpublishedCount + summary.stats.unpublishedCount,
      inProgressCount: stats.inProgressCount + summary.stats.inProgressCount,
      totalExchangeCount: stats.totalExchangeCount + summary.stats.totalExchangeCount,
      totalAmountYen: stats.totalAmountYen + summary.stats.totalAmountYen,
      totalExchangeFeeYen: stats.totalExchangeFeeYen + summary.stats.totalExchangeFeeYen,
      totalPayableYen: stats.totalPayableYen + summary.stats.totalPayableYen,
    }),
    {
      registeredMerchantCount: registeredMerchants.length,
      activeMerchantCount: merchants.filter((merchant) => merchant.status === "ACTIVE").length,
      inactiveMerchantCount: merchants.filter((merchant) => merchant.status === "INACTIVE").length,
      rejectedMerchantCount: merchants.filter((merchant) => merchant.status === "REJECTED").length,
      pendingMerchantCount: merchants.filter((merchant) => merchant.status === "PENDING").length,
      publishedCount: 0,
      unpublishedCount: 0,
      inProgressCount: 0,
      totalExchangeCount: 0,
      totalAmountYen: 0,
      totalExchangeFeeYen: 0,
      totalPayableYen: 0,
    },
  );
}

function buildOverallMonthlyFinance(summaries: MerchantSummaryDetail[]): MerchantMonthlyFinanceRow[] {
  const byMonth = new Map<
    string,
    {
      exchangeCount: number;
      salesYen: number;
      exchangeFeeYen: number;
      payableYen: number;
      itemsByMerchandise: Map<string, MerchantMonthlyFinanceItemRow>;
    }
  >();

  for (const summary of summaries) {
    for (const row of summary.monthly) {
      const entry = byMonth.get(row.month) ?? {
        exchangeCount: 0,
        salesYen: 0,
        exchangeFeeYen: 0,
        payableYen: 0,
        itemsByMerchandise: new Map(),
      };
      entry.exchangeCount += row.exchangeCount;
      entry.salesYen += row.salesYen;
      entry.exchangeFeeYen += row.exchangeFeeYen;
      entry.payableYen += row.payableYen;

      for (const item of row.items) {
        const key = `${summary.merchantId}:${item.merchandiseId}`;
        const current = entry.itemsByMerchandise.get(key) ?? {
          merchandiseId: key,
          merchandiseName: `${summary.merchantName} / ${item.merchandiseName}`,
          exchangeCount: 0,
          salesYen: 0,
        };
        current.exchangeCount += item.exchangeCount;
        current.salesYen += item.salesYen;
        entry.itemsByMerchandise.set(key, current);
      }

      byMonth.set(row.month, entry);
    }
  }

  return buildRecentMonths(MONTH_WINDOW).map((month) => ({
    month,
    exchangeCount: byMonth.get(month)?.exchangeCount ?? 0,
    salesYen: byMonth.get(month)?.salesYen ?? 0,
    exchangeFeeYen: byMonth.get(month)?.exchangeFeeYen ?? 0,
    payableYen: byMonth.get(month)?.payableYen ?? 0,
    items: byMonth.get(month)
      ? Array.from(byMonth.get(month)!.itemsByMerchandise.values()).sort(
          (left, right) => right.salesYen - left.salesYen || right.exchangeCount - left.exchangeCount,
        )
      : [],
  }));
}

// 提携企業サマリー画面用：全体の集計値、月ごとの収支、企業別概況をまとめて取得する。
export async function getMerchantOverallSummaryForOperator(): Promise<MerchantOverallSummary> {
  const config = getRuntimeConfig();
  const merchants: Merchant[] = await listMerchants({
    region: config.region,
    tableName: config.merchantTableName,
  });

  const targets = merchants
    .filter((merchant) => merchant.status !== "PENDING")
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  const summaries = await Promise.all(
    targets.map((merchant) => buildMerchantSummaryDetail(config, merchant)),
  );

  return {
    stats: buildOverallStats(merchants, summaries),
    monthly: buildOverallMonthlyFinance(summaries),
    merchants: summaries,
  };
}

// 企業別サマリー画面用：指定した提携企業の商品・交換の集計値と月ごとの収支を取得する。
export async function getMerchantSummaryDetailForOperator(
  merchantId: string,
): Promise<MerchantSummaryDetail | null> {
  const config = getRuntimeConfig();
  const merchant = await getMerchantById(
    { region: config.region, tableName: config.merchantTableName },
    merchantId,
  );

  if (!merchant) {
    return null;
  }

  return buildMerchantSummaryDetail(config, merchant);
}

// 既存呼び出し用：提携企業ごとの商品・交換の集計値と月ごとの収支をまとめて取得する。
export async function listMerchantSummaryDetailsForOperator(): Promise<MerchantSummaryDetail[]> {
  const overall = await getMerchantOverallSummaryForOperator();
  return overall.merchants;
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
