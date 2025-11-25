export type MissionReportStatus = "PENDING" | "APPROVED" | "REJECTED";

export type MissionReport = {
  companyId: string;
  userId: string;
  reportId: string;
  missionId: string;
  missionVersion?: number; // どのバージョンのミッション定義か
  reportedAt: string; // ISO 8601
  status: MissionReportStatus;

  // 従業員が入力したフィールドの値（キー: fieldId, 値: 入力値）
  fieldValues?: Record<string, string | number | boolean>;

  // スコア・ポイント
  scoreGranted?: number;
  pointGranted?: number;

  // レビュー情報（管理者による承認/却下）
  reviewComment?: string;
  reviewedBy?: string;
  reviewedAt?: string; // ISO 8601

  // システムメタデータ
  createdAt?: string; // ISO 8601
  updatedAt?: string; // ISO 8601

  // 後方互換性のため残す（非推奨）
  comment?: string;
};
