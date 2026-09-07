import type {
  DBUserAddress,
  ExchangeHistoryActorType,
  ExchangeHistoryStatus,
  ExchangeHistoryStatusEvent,
  ExchangeShipment,
} from "@correcre/types";

export type OperatorExchangeSummary = {
  exchangeId: string;
  merchantId: string;
  merchantName?: string;
  companyId: string;
  companyName?: string;
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
};

export type OperatorExchangeDetail = OperatorExchangeSummary & {
  applicantEmail?: string;
  applicantPhoneNumber?: string;
  applicantAddress?: DBUserAddress;
  merchandiseImageViewUrl?: string;
  history: ExchangeHistoryStatusEvent[];
  allowedNextStatuses: ExchangeHistoryStatus[];
  actorType: ExchangeHistoryActorType;
  // 配送日程調整が進行中かどうか。進行中は承認（準備中への遷移）が候補から外れるため、
  // 画面側でその理由を説明するのに使う。
  scheduleActive: boolean;
  // 発送情報。提携企業の登録は任意なので、発送済みでも入っていないことがある。
  // 「まだ届かない」という申請者からの問い合わせに運用者が答えるために表示する。
  shipment?: ExchangeShipment;
  trackingUrl?: string;
  carrierLabel?: string;
  // 確定済みのお届け日 (YYYY-MM-DD)。発送情報と併せて配送の遅れを判断する
  selectedArrivalDate?: string;
};

export type TransitionOperatorExchangeRequest = {
  nextStatus: ExchangeHistoryStatus;
  comment?: string;
};

export type OperatorExchangeFilter = "ALL" | ExchangeHistoryStatus;
