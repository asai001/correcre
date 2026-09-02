import type {
  DBUserAddress,
  DeliveryCandidate,
  ExchangeHistoryActorType,
  ExchangeHistoryStatus,
  ExchangeHistoryStatusEvent,
  ScheduleEventActor,
  ScheduleEventType,
  ScheduleStatus,
} from "@correcre/types";

// 候補 1 件の表示用ビュー。selectable / warning はサーバー側で計算済み（フロントで日付計算はしない）。
export type ScheduleCandidateView = DeliveryCandidate & {
  selectable: boolean;
  // 発送可能曜日外・休業日などの注意。ブロックはしない（merchant の判断を優先する）
  warnings: string[];
};

export type ScheduleEventView = {
  seq: number;
  occurredAt: string;
  actor: ScheduleEventActor;
  actorName?: string;
  eventType: ScheduleEventType;
  payload: Record<string, unknown>;
};

export type RequestedDateJudgment = {
  ok: boolean;
  shipDate?: string;
  // ok=false のときの理由 / ok=true のときの補足（例: 発送可能曜日から逆算して発送可能です）
  message: string;
};

export type ExchangeScheduleView = {
  scheduleStatus: ScheduleStatus;
  // 保存済みの候補（employee に提示済み、または申請時の叩き台）
  candidates: ScheduleCandidateView[];
  // 提示フォーム用にいま時点で自動生成した候補（AWAITING_PROPOSAL / 再提示のとき）
  draftCandidates: ScheduleCandidateView[];
  merchantNote?: string;
  selectedArrivalDate?: string;
  selectedTimeSlot?: string;
  confirmedAt?: string;
  requestedArrivalDate?: string;
  requestedTimeSlot?: string;
  requestedNote?: string;
  requestedDateJudgment?: RequestedDateJudgment;
  merchantRejectReason?: string;
  proposalRoundCount: number;
  proposalRoundLimit: number;
  rescheduleRequestCount: number;
  rescheduleRequestLimit: number;
  // 再提示（proposalRoundCount 消費）がまだ可能か
  canRepropose: boolean;
  availableTimeSlots: string[];
  shippableWeekdays: number[];
  leadTimeBusinessDays: number;
  transitDays: number;
  cutoffTime: string;
  events: ScheduleEventView[];
};

export type ProposeScheduleRequest = {
  arrivalDates: string[];
  merchantNote?: string;
};

export type RespondScheduleRequest =
  | { action: "ACCEPT" }
  | { action: "REJECT"; reason: string }
  | { action: "REPROPOSE"; arrivalDates: string[]; merchantNote?: string };

export type PreviewScheduleRequest = {
  arrivalDates: string[];
};

export type PreviewScheduleResponse = {
  candidates: ScheduleCandidateView[];
};

export type ExchangeSummary = {
  exchangeId: string;
  // 予約型サービスの交換番号（COCR-XXXX）。申請者が予約時に店舗へ伝える番号で、
  // 予約不要の商品・連番導入前の交換には無い
  reservationCode?: string;
  companyId: string;
  userId: string;
  userName?: string;
  merchandiseId?: string;
  merchandiseName: string;
  usedPoint: number;
  pointHeld: number;
  status: ExchangeHistoryStatus;
  exchangedAt: string;
  requestedAt?: string;
  completedAt?: string;
  canceledAt?: string;
  updatedAt?: string;
  // 直近の状態更新を「誰が・いつ」行ったか。一覧から操作者を追えるようにするための情報。
  lastActionActorType?: ExchangeHistoryActorType;
  lastActionActorName?: string;
  lastActionAt?: string;
};

export type ExchangeDetail = ExchangeSummary & {
  merchantId: string;
  companyName?: string;
  applicantEmail?: string;
  applicantPhoneNumber?: string;
  applicantAddress?: DBUserAddress;
  merchandiseImageViewUrl?: string;
  history: ExchangeHistoryStatusEvent[];
  allowedNextStatuses: ExchangeHistoryStatus[];
  actorType: ExchangeHistoryActorType;
  // 配送日程調整（日程調整なしの交換では undefined）
  schedule?: ExchangeScheduleView;
  // 予約が必要な商品（サロン等）か。予約・来店確認の運用案内の表示に使う
  reservationRequired?: boolean;
};

export type TransitionExchangeRequest = {
  nextStatus: ExchangeHistoryStatus;
  comment?: string;
};

export type ExchangeListFilter = "ALL" | ExchangeHistoryStatus;
