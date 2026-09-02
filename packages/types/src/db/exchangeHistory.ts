// Legacy values "REQUESTED" / "COMPLETED" / "CANCELLED" remain readable for
// backward compatibility. New writes use the expanded set including the
// US-spelled "CANCELED" so the application code can normalize on load.
export type ExchangeHistoryStatus =
  | "REQUESTED"
  | "PREPARING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELED"
  | "CANCELLED";

export type ExchangeHistoryActorType = "EMPLOYEE" | "MERCHANT" | "OPERATOR" | "SYSTEM";

export type ExchangeHistoryStatusEvent = {
  status: ExchangeHistoryStatus;
  occurredAt: string;
  actorType: ExchangeHistoryActorType;
  actorId?: string;
  // 操作した担当者の表示名スナップショット。後で改名・退職しても「誰が操作したか」を追える。
  // actorName を持たない過去のイベントは、表示側で actorId から名前を引き当てる。
  actorName?: string;
  comment?: string;
};

// 配送日程調整のステータス。
// NOT_REQUIRED は schedule 属性を持たない既存レコード・日程調整なし商品を含む（読み取り時に解釈）。
export type ScheduleStatus =
  | "NOT_REQUIRED"
  | "AWAITING_PROPOSAL" // merchant の候補提示待ち
  | "AWAITING_SELECTION" // employee の選択待ち
  | "AWAITING_MERCHANT_RESPONSE" // employee の希望日に対する merchant の応答待ち
  | "CONFIRMED"
  | "CANCELLED";

export type DeliveryCandidate = {
  arrivalDate: string; // YYYY-MM-DD
  shipDate: string; // この候補を成立させるための発送日 (YYYY-MM-DD)
  selectableUntil: string; // ISO8601。shipDate から leadTimeBusinessDays 分だけ営業日を遡った日の cutoffTime
};

// 候補の再提示・希望日申請の上限回数。上限到達時はキャンセル + ポイント返還。
export const SCHEDULE_PROPOSAL_ROUND_LIMIT = 2;
export const SCHEDULE_RESCHEDULE_REQUEST_LIMIT = 2;

export type ExchangeSchedule = {
  scheduleStatus: ScheduleStatus;
  candidates: DeliveryCandidate[];
  merchantNote?: string;
  selectedArrivalDate?: string;
  // 確定したお届け日に対応する発送日 (YYYY-MM-DD)。確定時に保存する。
  // これを持たない既存レコードは商品の transitDays から逆算して補う（読み取り時解決）。
  selectedShipDate?: string;
  selectedTimeSlot?: string;
  confirmedAt?: string;
  requestedArrivalDate?: string;
  requestedTimeSlot?: string;
  requestedNote?: string;
  proposalRoundCount: number; // 上限 SCHEDULE_PROPOSAL_ROUND_LIMIT
  rescheduleRequestCount: number; // 上限 SCHEDULE_RESCHEDULE_REQUEST_LIMIT
  acknowledgedAt?: string;
  // 同意時点の注意文言そのものを保存する。後から文面を変更しても、同意当時に何を提示していたかが残る。
  acknowledgedText?: string;
  // merchant が「対応不可」とした際の理由（employee へ提示する）
  merchantRejectReason?: string;
  // employee の希望日を候補として提示するときの発送日（承諾時に使用）
  requestedShipDate?: string;
  // 日次バッチの送信済みガード
  proposalReminderSentAt?: string; // 申請 24h 無反応の merchant 再通知
  selectionReminderSentAt?: string; // 選択期限 24h 前の employee 催促
  responseReminderSentAt?: string; // AWAITING_MERCHANT_RESPONSE 48h 超過の督促
  arrivalReminderSentAt?: string; // 確定日前日の受取リマインド
};

export type ExchangeHistoryItem = {
  pk: `COMPANY#${string}#USER#${string}`;
  sk: `EXCHANGED_AT#${string}#EXCHANGE#${string}`;
  exchangeId: string;
  companyId: string;
  userId: string;
  merchandiseId?: string;
  merchandiseNameSnapshot: string;
  merchantId?: string;
  merchantNameSnapshot?: string;
  usedPoint: number;
  requiredPointSnapshot?: number;
  priceYenSnapshot?: number;
  pointHeld?: number;
  quantity?: number;
  // 予約が必要な商品（サロン等）の交換番号（例: COCR-0001）。全提携企業共通の連番から
  // 申請作成時に採番する。予約時に店舗へ伝えて申請と照合するための人が読める番号で、
  // 予約不要の商品や採番導入前の既存レコードには存在しない（表示側は exchangeId へフォールバック）。
  reservationCode?: string;
  status?: ExchangeHistoryStatus;
  history?: ExchangeHistoryStatusEvent[];
  exchangedAt: string;
  requestedAt?: string;
  completedAt?: string;
  canceledAt?: string;
  createdAt?: string;
  updatedAt?: string;
  gsi1pk: `COMPANY#${string}`;
  gsi1sk: `EXCHANGED_AT#${string}#USER#${string}#EXCHANGE#${string}`;
  gsi2pk?: `MERCHANT#${string}#STATUS#${ExchangeHistoryStatus}`;
  gsi2sk?: `EXCHANGED_AT#${string}#EXCHANGE#${string}`;
  gsi3pk?: `MERCHANT#${string}`;
  gsi3sk?: `EXCHANGED_AT#${string}#EXCHANGE#${string}`;
  // 配送日程調整（既存レコード・日程調整なし商品には存在しない）
  schedule?: ExchangeSchedule;
  // スパース GSI: 日程調整が進行中（AWAITING_* / CONFIRMED）の間だけ設定し、
  // 準備中への移行・終端化で REMOVE する。日次バッチの横断クエリ用。
  // CONFIRMED 中は gsi4sk を ARRIVAL#<selectedArrivalDate> にして前日リマインドの範囲クエリに使う。
  gsi4pk?: `SCHEDULE#${ScheduleStatus}`;
  gsi4sk?: `EXCHANGED_AT#${string}` | `ARRIVAL#${string}`;
};
