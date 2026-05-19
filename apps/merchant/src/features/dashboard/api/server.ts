import "server-only";

import { listExchangeHistoryByMerchant } from "@correcre/lib/dynamodb/exchange-history";
import { listMerchandiseByMerchant } from "@correcre/lib/dynamodb/merchandise";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import type { ExchangeHistoryItem, ExchangeHistoryStatus } from "@correcre/types";

export type DashboardKpi = {
  publishedMerchandiseCount: number;
  draftMerchandiseCount: number;
  unpublishedMerchandiseCount: number;
  monthlyExchangeCount: number;
  monthlyCompletedCount: number;
  monthlyCompletionRate: number;
  pendingExchangeCount: number;
  inProgressExchangeCount: number;
  completedTotalCount: number;
};

export type DashboardRecentExchange = {
  exchangeId: string;
  status: ExchangeHistoryStatus;
  merchandiseId: string;
  merchandiseName: string;
  exchangedAt: string;
  usedPoint: number;
};

export type DashboardData = {
  kpi: DashboardKpi;
  recentExchanges: DashboardRecentExchange[];
};

function getCurrentYearMonthRange(now: Date): { startIso: string; endIso: string } {
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export async function getMerchantDashboardData(merchantId: string): Promise<DashboardData> {
  const region = readRequiredServerEnv("AWS_REGION");
  const merchandiseTableName = readRequiredServerEnv("DDB_MERCHANDISE_TABLE_NAME");
  const exchangeHistoryTableName = readRequiredServerEnv("DDB_EXCHANGE_HISTORY_TABLE_NAME");

  const [merchandiseItems, exchanges] = await Promise.all([
    listMerchandiseByMerchant({ region, tableName: merchandiseTableName }, merchantId),
    listExchangeHistoryByMerchant({ region, tableName: exchangeHistoryTableName }, merchantId),
  ]);

  const { startIso, endIso } = getCurrentYearMonthRange(new Date());

  const monthly = exchanges.filter((item) => item.exchangedAt >= startIso && item.exchangedAt < endIso);
  const monthlyCompleted = monthly.filter((item) => item.status === "COMPLETED");
  const monthlyCompletionRate =
    monthly.length === 0 ? 0 : monthlyCompleted.length / monthly.length;

  const publishedMerchandiseCount = merchandiseItems.filter((item) => item.status === "PUBLISHED").length;
  const draftMerchandiseCount = merchandiseItems.filter((item) => item.status === "DRAFT").length;
  const unpublishedMerchandiseCount = merchandiseItems.filter((item) => item.status === "UNPUBLISHED").length;

  const pendingExchangeCount = exchanges.filter((item) => item.status === "REQUESTED").length;
  const inProgressExchangeCount = exchanges.filter(
    (item) => item.status === "PREPARING" || item.status === "IN_PROGRESS",
  ).length;
  const completedTotalCount = exchanges.filter((item) => item.status === "COMPLETED").length;

  const recentExchanges: DashboardRecentExchange[] = [...exchanges]
    .sort((a, b) => (a.exchangedAt < b.exchangedAt ? 1 : -1))
    .slice(0, 5)
    .map((item: ExchangeHistoryItem) => ({
      exchangeId: item.exchangeId,
      status: item.status ?? "COMPLETED",
      merchandiseId: item.merchandiseId ?? "",
      merchandiseName: item.merchandiseNameSnapshot ?? item.merchandiseId ?? "",
      exchangedAt: item.exchangedAt,
      usedPoint: item.usedPoint,
    }));

  return {
    kpi: {
      publishedMerchandiseCount,
      draftMerchandiseCount,
      unpublishedMerchandiseCount,
      monthlyExchangeCount: monthly.length,
      monthlyCompletedCount: monthlyCompleted.length,
      monthlyCompletionRate,
      pendingExchangeCount,
      inProgressExchangeCount,
      completedTotalCount,
    },
    recentExchanges,
  };
}
