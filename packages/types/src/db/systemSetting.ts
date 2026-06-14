// アプリ全体の設定（1 設定 = 1 アイテム）。
export type NotificationSettingItem = {
  settingKey: "NOTIFICATION";
  // 請求メール・ユーザー追加通知などの運用者宛メールの送信先（複数）。
  operatorNotificationEmails?: string[];
  // 旧形式（単一）。読み取り時の後方互換のためにのみ残す。
  operatorNotificationEmail?: string;
  updatedAt: string;
  updatedBy?: string;
};
