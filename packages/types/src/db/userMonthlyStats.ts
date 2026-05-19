export type UserMonthlyStats = {
  pk: `COMPANY#${string}#USER#${string}`;
  sk: `YM#${string}`;
  companyId: string;
  userId: string;
  yearMonth: string;
  earnedPoints: number;
  usedPoints: number;
  earnedScore: number;
  completionRate: number;
  missionCompletedCount: number;
  updatedAt: string;
  gsi1pk: `COMPANY#${string}`;
  gsi1sk: `YM#${string}#USER#${string}`;
};
