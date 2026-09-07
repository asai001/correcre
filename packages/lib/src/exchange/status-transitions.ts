// 交換ステータスの遷移規則。「誰がどの状態からどこへ動かせるか」を決める business rule で、
// DB アクセスとは独立しているため純モジュールとして切り出してある（テストしやすさのため）。
import type { ExchangeHistoryActorType, ExchangeHistoryStatus } from "@correcre/types";

const ALLOWED_TRANSITIONS: Record<
  ExchangeHistoryStatus,
  Partial<Record<ExchangeHistoryActorType, ExchangeHistoryStatus[]>>
> = {
  REQUESTED: {
    MERCHANT: ["PREPARING", "REJECTED", "CANCELED"],
    OPERATOR: ["PREPARING", "REJECTED", "CANCELED"],
    // SYSTEM は配送日程調整の確定（→ PREPARING）と、期限切れ・上限到達の自動キャンセルに使う。
    SYSTEM: ["PREPARING", "CANCELED"],
    // EMPLOYEE のキャンセルは日程調整フローの文脈でのみ feature 層がゲートする（汎用のキャンセル API は作らない）。
    EMPLOYEE: ["CANCELED"],
  },
  PREPARING: {
    MERCHANT: ["IN_PROGRESS", "CANCELED"],
    OPERATOR: ["IN_PROGRESS", "CANCELED"],
  },
  IN_PROGRESS: {
    MERCHANT: ["COMPLETED", "PREPARING"],
    OPERATOR: ["COMPLETED", "PREPARING"],
  },
  // 完了は原則として終端。ただし「届いていないのに完了になった」ケースを救済できないと、
  // 申請者はポイントを失ったまま泣き寝入りになる。運用者だけが取り消せる逃げ道を残す
  // （提携企業に開放すると、売上を消す操作を当事者ができてしまう）。
  COMPLETED: {
    OPERATOR: ["CANCELED"],
  },
  REJECTED: {},
  CANCELED: {},
  CANCELLED: {},
};

export function getAllowedNextExchangeStatuses(
  from: ExchangeHistoryStatus,
  actor: ExchangeHistoryActorType,
): ExchangeHistoryStatus[] {
  return ALLOWED_TRANSITIONS[from]?.[actor] ?? [];
}

export function canTransitionExchangeStatus(
  from: ExchangeHistoryStatus,
  to: ExchangeHistoryStatus,
  actor: ExchangeHistoryActorType,
): boolean {
  return getAllowedNextExchangeStatuses(from, actor).includes(to);
}

export class InvalidExchangeStatusTransitionError extends Error {
  constructor(
    public readonly from: ExchangeHistoryStatus,
    public readonly to: ExchangeHistoryStatus,
    public readonly actor: ExchangeHistoryActorType,
  ) {
    super(`Status transition ${from} -> ${to} is not allowed for actor ${actor}`);
    this.name = "InvalidExchangeStatusTransitionError";
  }
}
