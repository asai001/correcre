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

// 運用者画面から提携企業へ送った一斉メールの送信履歴（1 送信 = 1 アイテム）。
// system-setting テーブルに settingKey = "MERCHANT_BROADCAST#<sentAt>#<broadcastId>" で保存する。
export type MerchantBroadcastLogItem = {
  settingKey: `MERCHANT_BROADCAST#${string}`;
  broadcastId: string;
  sentAt: string;
  subject: string;
  body: string;
  // 送信対象として選択した提携企業
  merchants: { merchantId: string; merchantName: string }[];
  recipientCount: number;
  sentCount: number;
  // 送信に失敗した宛先
  failedEmails: string[];
  sentBy: { userId: string; email: string; displayName?: string };
};

// 導入企業向け請求書（運用者 → 導入企業）の発行元情報。運用者画面の「設定」で編集する。
// system-setting テーブルに settingKey = "INVOICE_ISSUER" の 1 アイテムだけ置く。
export type InvoiceIssuerSettingItem = {
  settingKey: "INVOICE_ISSUER";
  companyName: string;
  postalCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  // 適格請求書発行事業者の登録番号（T + 13 桁）
  registrationNumber?: string;
  // 振込先（銀行名・支店名・種別・口座番号・名義）。請求書にそのまま載せる自由記述
  bankAccount?: string;
  // 請求書の備考欄に載せる文言
  note?: string;
  updatedAt: string;
  updatedBy?: string;
};
