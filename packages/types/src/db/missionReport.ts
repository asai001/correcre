export type MissionReportStatus = "PENDING" | "APPROVED" | "REJECTED";

export type MissionReport = {
  companyId: string;
  userId: string;
  reportId: string;
  missionId: string;
  missionVersion?: number;
  missionTitleSnapshot?: string;
  scoreSnapshot?: number;
  reportedAt: string; // ISO 8601
  status: MissionReportStatus;
  fieldValues?: Record<string, string | number | boolean>;
  scoreGranted?: number;
  pointGranted?: number;
  reviewComment?: string;
  reviewedBy?: string;
  reviewedByUserId?: string;
  reviewedAt?: string; // ISO 8601
  createdAt?: string; // ISO 8601
  updatedAt?: string; // ISO 8601
  comment?: string;
};
