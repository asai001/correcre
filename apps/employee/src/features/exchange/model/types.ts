import type { PublicMerchandiseSummary } from "@correcre/merchandise-public";

export type ExchangeListItem = PublicMerchandiseSummary;

export type ExchangeDetail = PublicMerchandiseSummary;

export type RequestExchangeResponse = {
  exchangeId: string;
  status: "REQUESTED";
  merchandiseId: string;
  merchantId: string;
  usedPoint: number;
  pointHeld: number;
  exchangedAt: string;
  currentPointBalance: number;
};

export type RequestExchangeError = {
  code: "INSUFFICIENT_POINT_BALANCE" | "MERCHANDISE_UNAVAILABLE" | "INTERNAL_ERROR";
  message: string;
};
