export type DBUserItem = {
  companyId: string;
  userId: string;
  name: string;
  kanaName?: string;
  departmentId?: string;
  departmentName?: string;
  loginId: string; // 社員ごとのログインID（メール以外のログイン用）
  email: string;
  roles: ("EMPLOYEE" | "MANAGER" | "ADMIN")[];
  status: "ACTIVE" | "INACTIVE" | "DELETED";

  joinedAt?: string; // ISO 8601 コレクレ参加日
  leftAt?: string; // ISO 8601 退職日
  lastLoginAt?: string; // ISO 8601
};
