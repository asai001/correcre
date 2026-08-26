import type { ExchangeHistoryStatus, ScheduleStatus } from "@correcre/types";

export type ExchangeHistory = {
  date: string; // ISO 文字列など
  exchangeId: string;
  merchantName?: string;
  merchandiseName: string;
  usedPoint: number;
  status?: ExchangeHistoryStatus;
  // 配送日程調整の状態（日程調整なしの交換では undefined）
  scheduleStatus?: ScheduleStatus;
  // 確定済みのお届け日 (YYYY-MM-DD)
  selectedArrivalDate?: string;
};
