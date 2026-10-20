import type { SalesPendingSummary } from "@correcre/lib/exchange/sales-recognition";

// 月内の商品・サービスごとの売上内訳。
export type SettlementItemRow = {
  merchandiseId: string;
  merchandiseName: string;
  exchangeCount: number;
  salesYen: number;
};

// 月ごとの収支（売上・手数料・請求額）。
export type SettlementMonthRow = {
  month: string; // YYYY-MM
  exchangeCount: number;
  salesYen: number;
  exchangeFeeYen: number;
  invoiceYen: number;
  invoiceEmailSentAt?: string;
  items: SettlementItemRow[];
};

export type SettlementData = {
  months: SettlementMonthRow[]; // 新しい月が先頭
  current: SettlementMonthRow;
  // 適用される交換手数料率（%）。運用者が提携企業ごとに設定する。
  exchangeFeePercent: number;
  // 完了待ち（申請中・準備中・対応中）の交換。完了するまで売上には計上しない。
  pending: SalesPendingSummary;
};
