// 予約型サービスの交換番号（COCR-XXXX）用の全提携企業共通の連番カウンタ。
// system-setting テーブルに 1 アイテムだけ置き、ADD によるアトミック更新で採番する。
export type ReservationCodeCounterItem = {
  settingKey: "RESERVATION_CODE_COUNTER";
  // 最後に採番した連番（次の採番は value + 1）
  value: number;
};

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
