export type DashboardSummary = {
  /** 今月の獲得点数 */
  thisMonthEarnedScore: number;

  /** 現在の保有ポイント（利用可能・反映済み） */
  currentPointBalance: number;

  /** 翌月反映予定のポイント（今月の未反映分） */
  pendingPointBalance: number;

  /** 先月の獲得ポイント */
  lastMonthEarnedPoints: number;
};
