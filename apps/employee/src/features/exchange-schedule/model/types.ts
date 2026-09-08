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
  // 「受け取りました」「届いていない」を押せるか（発送済みで、まだ完了していない）
  canConfirmReceipt: boolean;
  // 未着報告済みなら、その報告日時。提携企業が確認中であることの表示に使う
  deliveryIssueReportedAt?: string;
  // 発送情報。提携企業が送り状番号を登録したときだけ入る（登録は任意なので無いことも多い）
  shippedAt?: string;
  trackingNumber?: string;
  carrierLabel?: string;
  trackingUrl?: string;
};

export type SelectCandidateRequest = {
  arrivalDate: string;
  timeSlot?: string;
  // 生鮮品のとき必須。true で同意文言と時刻を保存する
  acknowledged?: boolean;
};

export type ReportDeliveryIssueRequest = {
  note?: string;
};

export type RequestDateRequest = {
  requestedArrivalDate: string;
  requestedTimeSlot?: string;
  requestedNote?: string;
  // 生鮮品のとき必須。希望日が承諾されるとそのまま確定するため、申請時点で同意を取る
  acknowledged?: boolean;
};

// 予約が必要な商品（サロン等）の交換詳細ビュー。日程調整ではなく、
// 外部予約（ホットペッパービューティー・電話等）の案内と交換番号の提示を担う。
export type EmployeeReservationView = {
  exchangeId: string;
  // 予約時に店舗へ伝える交換番号（COCR-XXXX）。連番導入前の交換には無い
  reservationCode?: string;
  merchandiseName: string;
  merchantName?: string;
  usedPoint: number;
  status: ExchangeHistoryStatus;
  reservationUrl?: string;
  instructions?: string;
};

// マイページの「予約と来店をお願いします」バナー表示用。
// 承認済み（準備中・対応中）でまだ完了していない予約型サービスの交換。
export type PendingReservationSummary = {
  exchangeId: string;
  merchandiseName: string;
  merchantName?: string;
  // 予約時に店舗へ伝える交換番号（COCR-XXXX）。連番導入前の交換には無い
  reservationCode?: string;
};

// マイページのバナー表示用
export type PendingScheduleSummary = {
  exchangeId: string;
  merchandiseName: string;
  scheduleStatus: ScheduleStatus;
  // 選択待ちのとき、最も早い選択期限のラベル
  nearestDeadlineLabel?: string;
};
