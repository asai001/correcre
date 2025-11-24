export type MissionReportStatus = "PENDING" | "APPROVED" | "REJECTED";

export type MissionReport = {
  companyId: string;
  userId: string;
  reportId: string;
  missionId: string;
  reportedAt: string; // ISO 8601
  status: MissionReportStatus;
  pointGranted?: number; // 付与されたポイント（承認時）
  scoreGranted?: number; // 付与されたスコア
  comment?: string; // 報告コメントや管理者コメント
};
