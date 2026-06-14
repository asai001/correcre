import "server-only";

import {
  calculateExchangeFeeYen,
  calculateMerchantInvoiceYen,
  resolveExchangeFeePercent,
} from "@correcre/lib/billing";
import { listExchangeHistoryByMerchant } from "@correcre/lib/dynamodb/exchange-history";
import { getMerchantById } from "@correcre/lib/dynamodb/merchant";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { POINT_YEN_VALUE } from "@correcre/lib/points";
import type { ExchangeHistoryStatus } from "@correcre/types";

import type { SettlementData, SettlementItemRow, SettlementMonthRow } from "../model/types";

// 表示する月数（直近 N か月）。運用者側の収支ダッシュボードと揃える。
const MONTH_WINDOW = 12;

// 却下・キャンセル以外を売上対象の交換とみなす（運用者側の支出集計と同じ基準）。
function isSalesExchange(status?: ExchangeHistoryStatus): boolean {
  const normalized = status === "CANCELLED" ? "CANCELED" : status;
  return normalized !== "REJECTED" && normalized !== "CANCELED";
}

function buildRecentMonths(count: number): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let offset = 0; offset < count; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

function toYearMonth(value: string): string {
  return value.slice(0, 7);
}

type MonthAggregate = {
  salesYen: number;
  count: number;
  itemsByMerchandise: Map<string, SettlementItemRow>;
};

function buildRow(month: string, exchangeFeePercent: number, aggregate?: MonthAggregate): SettlementMonthRow {
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
    items,
  };
}

// 提携企業に設定された交換手数料率（%）を取得する。未設定の場合は既定値。
async function getExchangeFeePercent(merchantId: string): Promise<number> {
  const region = readRequiredServerEnv("AWS_REGION");
  const tableName = readRequiredServerEnv("DDB_MERCHANT_TABLE_NAME");
  const merchant = await getMerchantById({ region, tableName }, merchantId);
  return resolveExchangeFeePercent(merchant?.exchangeFeePercent);
}

async function aggregateSalesByMonth(merchantId: string): Promise<Map<string, MonthAggregate>> {
  const region = readRequiredServerEnv("AWS_REGION");
  const tableName = readRequiredServerEnv("DDB_EXCHANGE_HISTORY_TABLE_NAME");

  const exchanges = await listExchangeHistoryByMerchant({ region, tableName }, merchantId);

  const byMonth = new Map<string, MonthAggregate>();
  for (const exchange of exchanges) {
    if (!isSalesExchange(exchange.status)) {
      continue;
    }
    const month = toYearMonth(exchange.exchangedAt);
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
  const [byMonth, exchangeFeePercent] = await Promise.all([
    aggregateSalesByMonth(merchantId),
    getExchangeFeePercent(merchantId),
  ]);

  const months: SettlementMonthRow[] = buildRecentMonths(MONTH_WINDOW).map((month) =>
    buildRow(month, exchangeFeePercent, byMonth.get(month)),
  );

  return {
    months,
    current: months[0],
    exchangeFeePercent,
  };
}

// 請求メール送信時にサーバー側で金額を再計算するためのヘルパー。
export async function getSettlementForMonth(
  merchantId: string,
  month: string,
): Promise<{ settlement: SettlementMonthRow; exchangeFeePercent: number }> {
  const [byMonth, exchangeFeePercent] = await Promise.all([
    aggregateSalesByMonth(merchantId),
    getExchangeFeePercent(merchantId),
  ]);
  return { settlement: buildRow(month, exchangeFeePercent, byMonth.get(month)), exchangeFeePercent };
}
