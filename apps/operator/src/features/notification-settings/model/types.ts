// 通知設定（運用者宛メールの送信先）。
export type NotificationSettingsData = {
  operatorNotificationEmails: string[]; // 未設定の場合は空配列
  updatedAt?: string;
};
