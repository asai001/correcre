import type { ExchangeHistoryStatus, ScheduleStatus, TemperatureZone } from "@correcre/types";

// 候補 1 件の表示用ビュー。日付の解釈・整形はすべてサーバー側で行う（フロントで日付計算しない）。
export type EmployeeScheduleCandidateView = {
  arrivalDate: string;
  // 例: 9月5日(土)
  arrivalDateLabel: string;
  selectableUntil: string;
  // 例: 9月3日(木) 12:00まで選択可能
  selectableUntilLabel: string;
  selectable: boolean;
};

export type EmployeeScheduleView = {
  exchangeId: string;
  merchandiseName: string;
  merchantName?: string;
  usedPoint: number;
  status: ExchangeHistoryStatus;
  scheduleStatus: ScheduleStatus;
  candidates: EmployeeScheduleCandidateView[];
  merchantNote?: string;
  // merchant が希望日に対応できなかったときの理由
  merchantRejectReason?: string;
  selectedArrivalDate?: string;
  selectedArrivalDateLabel?: string;
  selectedTimeSlot?: string;
  confirmedAt?: string;
  requestedArrivalDate?: string;
  requestedTimeSlot?: string;
  requestedNote?: string;
  availableTimeSlots: string[];
  // 「この中に受け取れる日がない（希望日を伝える）」を出せるか（上限未到達）
  canRequestDate: boolean;
  remainingRequestCount: number;
  canCancel: boolean;
  // 冷蔵・冷凍のとき true。確定前に同意チェックが必須
  requiresAcknowledgement: boolean;
  acknowledgementText: string;
  temperatureZone: TemperatureZone;
};

export type SelectCandidateRequest = {
  arrivalDate: string;
  timeSlot?: string;
  // 生鮮品のとき必須。true で同意文言と時刻を保存する
  acknowledged?: boolean;
};

export type RequestDateRequest = {
  requestedArrivalDate: string;
  requestedTimeSlot?: string;
  requestedNote?: string;
};

// マイページのバナー表示用
export type PendingScheduleSummary = {
  exchangeId: string;
  merchandiseName: string;
  scheduleStatus: ScheduleStatus;
  // 選択待ちのとき、最も早い選択期限のラベル
  nearestDeadlineLabel?: string;
};
