// 交換の売上計上ルール。提携企業の売上・請求額、運用者の支出（提携企業への支払額）は同じ基準で数える。
// 申請の時点では商品・サービスがまだ届いておらず、却下・キャンセルで取り消される可能性もあるため、
// 交換ステータスが「完了」になった時点で、完了した月の売上として計上する。
import type { ExchangeHistoryItem } from "@correcre/types";

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
