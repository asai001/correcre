import type { MerchandiseAuditActor, MerchandiseHistoryEvent, MerchandiseStatus } from "@correcre/types";

export const MERCHANDISE_STATUS_LABELS: Record<MerchandiseStatus, string> = {
  DRAFT: "下書き",
  PUBLISHED: "公開中",
  UNPUBLISHED: "非公開",
};

const HISTORY_ACTION_LABELS: Record<MerchandiseHistoryEvent["action"], string> = {
  CREATED: "新規登録",
  UPDATED: "内容を編集",
  STATUS_CHANGED: "公開状態を変更",
};

export function formatMerchandiseDateTime(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 操作者の表示名。名前スナップショットが無い古いレコードはメールアドレス、
// それも無ければユーザー ID にフォールバックする。
export function formatMerchandiseActor(actor?: MerchandiseAuditActor) {
  if (!actor) return "不明";
  return actor.name?.trim() || actor.email?.trim() || actor.userId;
}

export function formatMerchandiseHistoryLabel(event: MerchandiseHistoryEvent) {
  const base = HISTORY_ACTION_LABELS[event.action] ?? event.action;

  if (event.action === "STATUS_CHANGED" && event.status) {
    return `${base}（${MERCHANDISE_STATUS_LABELS[event.status]}）`;
  }

  return base;
}
