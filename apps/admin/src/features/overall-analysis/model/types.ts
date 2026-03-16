export type OverallAnalysisMissionItem = {
  name: string;
  percentage: number;
};

export type OverallAnalysisTrendItem = {
  month: string;
  averageScore: number;
};

export type OverallAnalysisAchievementItem = {
  label: string;
  percentage: number;
};

export type OverallExchangeHistoryItem = {
  date: string;
  employeeName: string;
  merchandiseName: string;
  usedPoint: number;
  status: "完了";
};

export type OverallAnalysisSummary = {
  averageScore: number;
  totalEarnedPoints: number;
  companyPointBalance: number;
  trendData: OverallAnalysisTrendItem[];
  achievementData: OverallAnalysisAchievementItem[];
  goodMissions: OverallAnalysisMissionItem[];
  improvementMissions: OverallAnalysisMissionItem[];
  exchangeHistory: OverallExchangeHistoryItem[];
};
