// 個別分析で使用する型定義

export type AnalysisFilter = {
  userId: string;
  yearMonth: string; // YYYY-MM 形式
};

export type EmployeeOption = {
  userId: string;
  name: string;
  department: string;
};

export type MonthOption = {
  value: string; // YYYY-MM
  label: string; // YYYY年MM月
};
