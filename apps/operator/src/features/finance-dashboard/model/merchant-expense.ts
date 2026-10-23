import { calculateExchangeFeeYen, calculateMerchantInvoiceYen } from "@correcre/lib/billing";
import {
  getSalesRecognizedAt,
  getSalesRecognitionMonth,
  isSalesRecognizedExchange,
} from "@correcre/lib/exchange/sales-recognition";
import { POINT_YEN_VALUE } from "@correcre/lib/points";
import type { ExchangeHistoryItem } from "@correcre/types";

import type { MerchantExpenseExchange, MerchantMonthlySettlement } from "./types";

// 提携企業 1 社分の支出（＝提携企業への支払額）を月ごとに集計する純関数。
// 支払額は提携企業側の「収支・精算」の請求額と一致させるため、交換ごとではなく
// 月の売上合計に対して手数料を計算する（端数切り捨ての位置を揃える）。
export function aggregateMerchantExpense(params: {
  exchanges: ExchangeHistoryItem[];
  exchangeFeePercent: number;
  // 内訳（交換ごとの明細）を持たせる表示対象の月
  months: readonly string[];
  // 申請者名・所属企業名の解決（DB を引くのは呼び出し側）
  describeApplicant?: (exchange: ExchangeHistoryItem) => { applicantName?: string; companyName?: string };
}): { byMonth: Record<string, MerchantMonthlySettlement>; totalExpenseYen: number } {
  const monthSet = new Set(params.months);
  const salesByMonth = new Map<string, number>();
  const exchangesByMonth = new Map<string, MerchantExpenseExchange[]>();

  for (const exchange of params.exchanges) {
    if (!isSalesRecognizedExchange(exchange)) {
      continue;
    }
    const month = getSalesRecognitionMonth(exchange);
    const amountYen = (exchange.usedPoint ?? 0) * POINT_YEN_VALUE;
    salesByMonth.set(month, (salesByMonth.get(month) ?? 0) + amountYen);

    if (monthSet.has(month)) {
      const list = exchangesByMonth.get(month) ?? [];
      list.push({
        exchangeId: exchange.exchangeId,
        completedAt: getSalesRecognizedAt(exchange),
        merchandiseName: exchange.merchandiseNameSnapshot || exchange.merchandiseId || "未設定",
        usedPoint: exchange.usedPoint ?? 0,
        amountYen,
        ...params.describeApplicant?.(exchange),
      });
      exchangesByMonth.set(month, list);
    }
  }

  let totalExpenseYen = 0;
  const byMonth: Record<string, MerchantMonthlySettlement> = {};
  for (const [month, salesYen] of salesByMonth) {
    const payableYen = calculateMerchantInvoiceYen(salesYen, params.exchangeFeePercent);
    totalExpenseYen += payableYen;
    if (monthSet.has(month)) {
      byMonth[month] = {
        salesYen,
        exchangeFeeYen: calculateExchangeFeeYen(salesYen, params.exchangeFeePercent),
        payableYen,
        exchanges: (exchangesByMonth.get(month) ?? []).sort((left, right) =>
          left.completedAt.localeCompare(right.completedAt),
        ),
      };
    }
  }

  return { byMonth, totalExpenseYen };
}
