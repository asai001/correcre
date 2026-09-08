// 配送日程調整の操作ログ。免責条項の根拠となるため追記のみ（更新・削除の経路を作らない）。
export type ScheduleEventActor = "MERCHANT" | "EMPLOYEE" | "SYSTEM";

export type ScheduleEventType =
  | "CANDIDATES_PROPOSED"
  | "CANDIDATE_SELECTED"
  | "DATE_REQUESTED"
  | "REQUEST_ACCEPTED"
  | "REQUEST_REJECTED"
  | "CANDIDATES_REGENERATED"
  | "DEADLINE_EXPIRED"
  | "CONFIRMED"
  | "CANCELLED";

export type ScheduleEventItem = {
  pk: `EXCHANGE#${string}`;
  sk: `SEQ#${string}`; // seq を 0 埋め 4 桁にした文字列（例 SEQ#0001）
  exchangeRequestId: string;
  seq: number;
  occurredAt: string;
  actor: ScheduleEventActor;
  actorId?: string;
  // 操作者の表示名スナップショット（後で改名・退職しても「誰が操作したか」を追える）
  actorName?: string;
  eventType: ScheduleEventType;
  payload: Record<string, unknown>;
};
