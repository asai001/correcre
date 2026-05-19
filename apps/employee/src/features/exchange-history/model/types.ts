import type { ExchangeHistoryStatus } from "@correcre/types";

export type ExchangeHistory = {
  date: string; // ISO 文字列など
  merchandiseName: string;
  usedPoint: number;
  status?: ExchangeHistoryStatus;
};
