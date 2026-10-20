// 交換の売上計上ルール。提携企業の売上・請求額、運用者の支出（提携企業への支払額）は同じ基準で数える。
// 申請の時点では商品・サービスがまだ届いておらず、却下・キャンセルで取り消される可能性もあるため、
// 交換ステータスが「完了」になった時点で、完了した月の売上として計上する。
import type { ExchangeHistoryItem } from "@correcre/types";

import { POINT_YEN_VALUE } from "../points";

type SalesRecognitionTarget = Pick<ExchangeHistoryItem, "status" | "completedAt" | "history" | "exchangedAt">;

// 売上に計上する交換か（完了した交換だけ）。
// 完了後に運用者が取り消した交換はステータスが CANCELED になるため、ここで外れる。
export function isSalesRecognizedExchange(item: Pick<ExchangeHistoryItem, "status">): boolean {
  return item.status === "COMPLETED";
}

// 売上を計上した日時（＝完了日時）。completedAt を持たない古い完了レコードは、
// ステータス履歴の最後の COMPLETED イベント、それもなければ申請日時で補う。
export function getSalesRecognizedAt(item: SalesRecognitionTarget): string {
  if (item.completedAt) {
    return item.completedAt;
  }
  const completedEvent = [...(item.history ?? [])].reverse().find((event) => event.status === "COMPLETED");
  return completedEvent?.occurredAt ?? item.exchangedAt;
}

// 売上を計上する月（YYYY-MM）。月キーは収支・精算画面と請求メール API と同じく、
// 保存されている ISO 文字列の先頭 7 文字で作る。
export function getSalesRecognitionMonth(item: SalesRecognitionTarget): string {
  return getSalesRecognizedAt(item).slice(0, 7);
}

// まだ売上に計上されていない（完了待ちの）交換のステータス。却下・キャンセルにならなければ、
// 完了した時点で完了月の売上になる。
export const SALES_PENDING_STATUSES = ["REQUESTED", "PREPARING", "IN_PROGRESS"] as const;

export type SalesPendingStatus = (typeof SALES_PENDING_STATUSES)[number];

export function isSalesPendingExchange(item: Pick<ExchangeHistoryItem, "status">): boolean {
  return (SALES_PENDING_STATUSES as ReadonlyArray<string | undefined>).includes(item.status);
}

export type SalesPendingAmount = {
  count: number;
  amountYen: number; // 交換相当額（使用ポイント × 5円）の合計。確定した売上ではない
};

export type SalesPendingSummary = SalesPendingAmount & {
  byStatus: Record<SalesPendingStatus, SalesPendingAmount>;
};

// 完了待ちの交換を、件数と交換相当額（ステータス別の内訳つき）にまとめる。
// 月には振り分けない（どの月に完了するかは未確定のため、現時点の残高として見せる）。
export function summarizeSalesPendingExchanges(
  exchanges: ReadonlyArray<Pick<ExchangeHistoryItem, "status" | "usedPoint">>,
): SalesPendingSummary {
  const byStatus = Object.fromEntries(
    SALES_PENDING_STATUSES.map((status) => [status, { count: 0, amountYen: 0 }]),
  ) as Record<SalesPendingStatus, SalesPendingAmount>;
  const summary: SalesPendingSummary = { count: 0, amountYen: 0, byStatus };

  for (const exchange of exchanges) {
    if (!isSalesPendingExchange(exchange)) {
      continue;
    }
    const amountYen = (exchange.usedPoint ?? 0) * POINT_YEN_VALUE;
    const entry = byStatus[exchange.status as SalesPendingStatus];
    entry.count += 1;
    entry.amountYen += amountYen;
    summary.count += 1;
    summary.amountYen += amountYen;
  }

  return summary;
}
