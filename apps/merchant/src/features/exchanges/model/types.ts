import type {
  ExchangeHistoryActorType,
  ExchangeHistoryStatus,
  ExchangeHistoryStatusEvent,
} from "@correcre/types";

export type ExchangeSummary = {
  exchangeId: string;
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

export type ExchangeDetail = ExchangeSummary & {
  merchantId: string;
  merchandiseImageViewUrl?: string;
  history: ExchangeHistoryStatusEvent[];
  allowedNextStatuses: ExchangeHistoryStatus[];
  actorType: ExchangeHistoryActorType;
};

export type TransitionExchangeRequest = {
  nextStatus: ExchangeHistoryStatus;
  comment?: string;
};

export type ExchangeListFilter = "ALL" | ExchangeHistoryStatus;
