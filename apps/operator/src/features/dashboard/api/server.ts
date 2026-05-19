import "server-only";

import { listExchangeHistoryByMerchant } from "@correcre/lib/dynamodb/exchange-history";
import { listMerchants } from "@correcre/lib/dynamodb/merchant";
import { listMerchandiseByStatus } from "@correcre/lib/dynamodb/merchandise";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import type { ExchangeHistoryItem, ExchangeHistoryStatus } from "@correcre/types";

export type OperatorDashboardKpi = {
  merchantCount: number;
  activeMerchantCount: number;
  publishedMerchandiseCount: number;
  monthlyExchangeCount: number;
  pendingExchangeCount: number;
  inProgressExchangeCount: number;
};

export type OperatorRecentExchange = {
  exchangeId: string;
  status: ExchangeHistoryStatus;
  merchantId: string;
  merchantName: string;
  merchandiseName: string;
  exchangedAt: string;
  usedPoint: number;
};

export type OperatorDashboardData = {
  kpi: OperatorDashboardKpi;
  recentExchanges: OperatorRecentExchange[];
};

function getCurrentYearMonthRange(now: Date): { startIso: string; endIso: string } {
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export async function getOperatorDashboardData(): Promise<OperatorDashboardData> {
  const region = readRequiredServerEnv("AWS_REGION");
  const merchantTableName = readRequiredServerEnv("DDB_MERCHANT_TABLE_NAME");
  const merchandiseTableName = readRequiredServerEnv("DDB_MERCHANDISE_TABLE_NAME");
  const exchangeHistoryTableName = readRequiredServerEnv("DDB_EXCHANGE_HISTORY_TABLE_NAME");

  const [merchants, publishedMerchandise] = await Promise.all([
    listMerchants({ region, tableName: merchantTableName }),
    listMerchandiseByStatus({ region, tableName: merchandiseTableName }, "PUBLISHED"),
  ]);

  const merchantNameById = new Map<string, string>();
  for (const merchant of merchants) {
    merchantNameById.set(merchant.merchantId, merchant.name);
  }

  const allExchanges: ExchangeHistoryItem[] = [];
  for (const merchant of merchants) {
    const items = await listExchangeHistoryByMerchant(
      { region, tableName: exchangeHistoryTableName },
      merchant.merchantId,
    );
    allExchanges.push(...items);
  }

  const { startIso, endIso } = getCurrentYearMonthRange(new Date());
  const monthlyExchanges = allExchanges.filter(
    (item) => item.exchangedAt >= startIso && item.exchangedAt < endIso,
  );

  const pendingExchangeCount = allExchanges.filter((item) => item.status === "REQUESTED").length;
  const inProgressExchangeCount = allExchanges.filter(
    (item) => item.status === "PREPARING" || item.status === "IN_PROGRESS",
  ).length;

  const recentExchanges: OperatorRecentExchange[] = [...allExchanges]
    .sort((a, b) => (a.exchangedAt < b.exchangedAt ? 1 : -1))
    .slice(0, 5)
    .map((item) => ({
      exchangeId: item.exchangeId,
      status: item.status ?? "COMPLETED",
      merchantId: item.merchantId ?? "",
      merchantName:
        item.merchantNameSnapshot ??
        (item.merchantId ? merchantNameById.get(item.merchantId) ?? "" : ""),
      merchandiseName: item.merchandiseNameSnapshot ?? item.merchandiseId ?? "",
      exchangedAt: item.exchangedAt,
      usedPoint: item.usedPoint,
    }));

  return {
    kpi: {
      merchantCount: merchants.length,
      activeMerchantCount: merchants.filter((m) => m.status === "ACTIVE").length,
      publishedMerchandiseCount: publishedMerchandise.length,
      monthlyExchangeCount: monthlyExchanges.length,
      pendingExchangeCount,
      inProgressExchangeCount,
    },
    recentExchanges,
  };
}
