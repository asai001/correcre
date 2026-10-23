import "server-only";

import {
  calculateExchangeFeeYen,
  calculateMerchantInvoiceYen,
  resolveExchangeFeePercent,
} from "@correcre/lib/billing";
import { listExchangeHistoryByMerchant } from "@correcre/lib/dynamodb/exchange-history";
import { getMerchantById } from "@correcre/lib/dynamodb/merchant";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import {
  getSalesRecognitionMonth,
  isSalesRecognizedExchange,
  summarizeSalesPendingExchanges,
} from "@correcre/lib/exchange/sales-recognition";
import { POINT_YEN_VALUE } from "@correcre/lib/points";
import type { ExchangeHistoryItem, Merchant } from "@correcre/types";

import type { SettlementData, SettlementItemRow, SettlementMonthRow } from "../model/types";

// 表示する月数（直近 N か月）。運用者側の収支ダッシュボードと揃える。
const MONTH_WINDOW = 12;

function buildRecentMonths(count: number): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let offset = 0; offset < count; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

type MonthAggregate = {
  salesYen: number;
  count: number;
  itemsByMerchandise: Map<string, SettlementItemRow>;
};

function buildRow(
  month: string,
  exchangeFeePercent: number,
  aggregate?: MonthAggregate,
  invoiceEmailSentAt?: string,
): SettlementMonthRow {
  const salesYen = aggregate?.salesYen ?? 0;
  const items = [...(aggregate?.itemsByMerchandise.values() ?? [])].sort(
    (left, right) => right.salesYen - left.salesYen,
  );
  return {
    month,
    exchangeCount: aggregate?.count ?? 0,
    salesYen,
    exchangeFeeYen: calculateExchangeFeeYen(salesYen, exchangeFeePercent),
    invoiceYen: calculateMerchantInvoiceYen(salesYen, exchangeFeePercent),
    invoiceEmailSentAt,
    items,
  };
}

async function getMerchantForSettlement(merchantId: string): Promise<Merchant | null> {
  const region = readRequiredServerEnv("AWS_REGION");
  const tableName = readRequiredServerEnv("DDB_MERCHANT_TABLE_NAME");
  return getMerchantById({ region, tableName }, merchantId);
}

async function listMerchantExchanges(merchantId: string): Promise<ExchangeHistoryItem[]> {
  const region = readRequiredServerEnv("AWS_REGION");
  const tableName = readRequiredServerEnv("DDB_EXCHANGE_HISTORY_TABLE_NAME");
  return listExchangeHistoryByMerchant({ region, tableName }, merchantId);
}

function aggregateSalesByMonth(exchanges: ExchangeHistoryItem[]): Map<string, MonthAggregate> {
  const byMonth = new Map<string, MonthAggregate>();
  // 売上は交換が完了した月に計上する（運用者側の支出集計と同じ基準）。
  for (const exchange of exchanges) {
    if (!isSalesRecognizedExchange(exchange)) {
      continue;
    }
    const month = getSalesRecognitionMonth(exchange);
    const entry = byMonth.get(month) ?? { salesYen: 0, count: 0, itemsByMerchandise: new Map() };
    const amountYen = (exchange.usedPoint ?? 0) * POINT_YEN_VALUE;
    entry.salesYen += amountYen;
    entry.count += 1;

    const merchandiseId = exchange.merchandiseId ?? "unknown";
    const item = entry.itemsByMerchandise.get(merchandiseId) ?? {
      merchandiseId,
      merchandiseName: exchange.merchandiseNameSnapshot || merchandiseId,
      exchangeCount: 0,
      salesYen: 0,
    };
    item.exchangeCount += 1;
    item.salesYen += amountYen;
    entry.itemsByMerchandise.set(merchandiseId, item);

    byMonth.set(month, entry);
  }
  return byMonth;
}

export async function getMerchantSettlementData(merchantId: string): Promise<SettlementData> {
  const [exchanges, merchant] = await Promise.all([
    listMerchantExchanges(merchantId),
    getMerchantForSettlement(merchantId),
  ]);
  const byMonth = aggregateSalesByMonth(exchanges);
  const exchangeFeePercent = resolveExchangeFeePercent(merchant?.exchangeFeePercent);

  const months: SettlementMonthRow[] = buildRecentMonths(MONTH_WINDOW).map((month) =>
    buildRow(month, exchangeFeePercent, byMonth.get(month), merchant?.invoiceEmailSentMonths?.[month]),
  );

  return {
    months,
    current: months[0],
    exchangeFeePercent,
    // 完了待ちの交換は月の売上に混ぜず、現時点の残高として別に見せる（未反映をエラーと誤認させないため）。
    pending: summarizeSalesPendingExchanges(exchanges),
  };
}

// 請求メール送信時にサーバー側で金額を再計算するためのヘルパー。
export async function getSettlementForMonth(
  merchantId: string,
  month: string,
): Promise<{ settlement: SettlementMonthRow; exchangeFeePercent: number }> {
  const [exchanges, merchant] = await Promise.all([
    listMerchantExchanges(merchantId),
    getMerchantForSettlement(merchantId),
  ]);
  const byMonth = aggregateSalesByMonth(exchanges);
  const exchangeFeePercent = resolveExchangeFeePercent(merchant?.exchangeFeePercent);
  return {
    settlement: buildRow(month, exchangeFeePercent, byMonth.get(month), merchant?.invoiceEmailSentMonths?.[month]),
    exchangeFeePercent,
  };
}
