export type MonthlyPointsHistoryItem = {
  yearMonth: string; // "YYYY-MM"
  earnedPoints: number;
};

/**
 * DynamoDB 上の 1件分の UserMonthlyStats イメージ
 */
export type UserMonthlyStatsRecord = {
  companyUserKey: string;
  yearMonth: string; // "YYYY-MM"
  earnedPoints: number;
  usedPoints: number;
  completionRate: number;
  missionCompletedCount: number;
  missionTargetCount: number;
};
