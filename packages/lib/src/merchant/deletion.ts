// 運用者による提携企業の削除（論理削除）のルール。DB もネットワークも触らない純関数。
//
// 削除は「間違えて作った」「作り直したい」だけでなく、取引を続けられない事情が後から判明した場合にも使う。
// そのため対応中の交換が残っていても止めきらず、運用者が確認したうえで強制削除できるようにする。
// 強制削除では対応中の交換をキャンセルして申請者にポイントを返す（2026-10-14 定例で合意）。
import type { ExchangeHistoryItem, ExchangeHistoryStatus } from "@correcre/types";

function normalizeStatus(status?: ExchangeHistoryStatus): ExchangeHistoryStatus {
  if (!status) return "REQUESTED";
  if (status === "CANCELLED") return "CANCELED";
  return status;
}

// 削除前に片付けが要る、対応中（申請中・準備中・発送済み）の交換か。完了・却下・キャンセルは履歴として残すだけ。
export function isOpenExchangeForMerchantDeletion(item: Pick<ExchangeHistoryItem, "status">): boolean {
  const status = normalizeStatus(item.status);
  return status === "REQUESTED" || status === "PREPARING" || status === "IN_PROGRESS";
}

// 強制削除で交換をキャンセルするまでの遷移。運用者は発送済み（IN_PROGRESS）から直接キャンセルできない
// （遷移規則で禁止している）ため、準備中へ戻してからキャンセルする。
export function planMerchantDeletionCancellation(status?: ExchangeHistoryStatus): ExchangeHistoryStatus[] {
  const normalized = normalizeStatus(status);
  if (normalized === "IN_PROGRESS") {
    return ["PREPARING", "CANCELED"];
  }
  if (normalized === "REQUESTED" || normalized === "PREPARING") {
    return ["CANCELED"];
  }
  return [];
}

// 誤操作防止のため、削除する提携企業名をそのまま入力してもらう。前後の空白だけは許容する。
export function isMerchantDeletionConfirmed(merchantName: string, confirmation: unknown): boolean {
  return typeof confirmation === "string" && confirmation.trim() !== "" && confirmation.trim() === merchantName.trim();
}

// 強制削除でキャンセルした交換の履歴に残すコメント。
export const MERCHANT_DELETION_CANCEL_COMMENT = "提携企業の削除に伴い、運用者がキャンセルしました（ポイントは返還済み）";
