export type DashboardSummary = {
  /** 今月の達成割合（0〜100 のパーセント） */
  thisMonthCompletionRate: number;

  /** 現在の保有ポイント */
  currentPointBalance: number;

  /** 先月の獲得ポイント */
  lastMonthEarnedPoints: number;
};
