// ダッシュボードのカード用の軽い型
export type UserForDashboard = {
  displayName: string;
  departmentName?: string;
  lastLoginAt?: string; // "2025/10/25 11:00" など表示用フォーマット後の文字列
};
