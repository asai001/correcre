// DynamoDB にほぼそのまま載るイメージ
export type User = {
  companyId: string;
  userId: string;

  displayName: string;
  displayNameKana?: string;

  departmentId?: string;
  departmentName?: string;

  email: string;
  loginId: string; // 社員ごとのログインID（メール以外のログイン用）

  role: "EMPLOYEE" | "MANAGER" | "ADMIN";
  status: "ACTIVE" | "INACTIVE" | "DELETED";

  joinedAt?: string; // ISO 8601
  leftAt?: string; // ISO 8601
  lastLoginAt?: string; // ISO 8601
};

// ダッシュボードのカード用の軽い型
export type UserForDashboard = {
  displayName: string;
  departmentName?: string;
  lastLoginAt?: string; // "2025/10/25 11:00" など表示用フォーマット後の文字列
};
