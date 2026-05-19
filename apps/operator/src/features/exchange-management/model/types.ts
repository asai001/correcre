import type {
  ExchangeHistoryActorType,
  ExchangeHistoryStatus,
  ExchangeHistoryStatusEvent,
} from "@correcre/types";

export type OperatorExchangeSummary = {
  exchangeId: string;
  merchantId: string;
  merchantName?: string;
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
};

export type OperatorExchangeDetail = OperatorExchangeSummary & {
  merchandiseImageViewUrl?: string;
  history: ExchangeHistoryStatusEvent[];
  allowedNextStatuses: ExchangeHistoryStatus[];
  actorType: ExchangeHistoryActorType;
};

export type TransitionOperatorExchangeRequest = {
  nextStatus: ExchangeHistoryStatus;
  comment?: string;
};

export type OperatorExchangeFilter = "ALL" | ExchangeHistoryStatus;
