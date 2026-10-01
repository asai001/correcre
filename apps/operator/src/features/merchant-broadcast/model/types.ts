import type { MerchantStatus } from "@correcre/types";

// 一斉メールの送信対象として選べる提携企業 1 社ぶんの情報。
export type MerchantBroadcastTarget = {
  merchantId: string;
  merchantName: string;
  status: MerchantStatus;
  createdAt: string;
  // 登録済みの商品・サービス数（下書き・非公開を含む）
  merchandiseCount: number;
  // 公開中の商品・サービス数
  publishedMerchandiseCount: number;
  // この提携企業に届く宛先メールアドレス
  recipientEmails: string[];
  // プレビューの差し込みに使う代表の宛先名
  sampleRecipientName: string;
};

export type MerchantBroadcastHistory = {
  broadcastId: string;
  sentAt: string;
  subject: string;
  body: string;
  merchantNames: string[];
  recipientCount: number;
  sentCount: number;
  failedEmails: string[];
  sentByName: string;
};

export type MerchantBroadcastPageData = {
  targets: MerchantBroadcastTarget[];
  history: MerchantBroadcastHistory[];
  // 履歴の読み込みに失敗した場合 true（送信自体はできる）
  historyUnavailable: boolean;
  merchantAppUrl?: string;
  operatorEmail: string;
};

export type MerchantBroadcastMode = "test" | "send";

export type SendMerchantBroadcastInput = {
  mode: MerchantBroadcastMode;
  subject: string;
  body: string;
  merchantIds: string[];
};

export type SendMerchantBroadcastResult = {
  mode: MerchantBroadcastMode;
  recipientCount: number;
  sentCount: number;
  failedEmails: string[];
  // 本送信で履歴の保存に失敗した場合 false（メール自体は送信済み）
  historySaved: boolean;
  history?: MerchantBroadcastHistory;
};
