// 個別分析で使用する型定義

export type AnalysisFilter = {
  userId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
};

export type EmployeeOption = {
  userId: string;
  name: string;
  department: string;
  isInactive: boolean;
  isInvited: boolean;
};

export type AnalysisMissionItem = {
  name: string;
  percentage: number;
};

export type AnalysisRadarItem = {
  category: string;
  achievement: number;
};

export type AnalysisTrendItem = {
  month: string;
  score: number;
};

export type IndividualAnalysisSummary = {
  earnedPoints: number;
  achievementScore: number;
  achievementRate: number;
  averageScore: number;
  radarData: AnalysisRadarItem[];
  trendData: AnalysisTrendItem[];
  goodMissions: AnalysisMissionItem[];
  improvementMissions: AnalysisMissionItem[];
};
