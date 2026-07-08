import type {
  SupportInquiryCategory,
  SupportInquiryItem,
  SupportInquirySource,
  SupportInquiryStatus,
} from "@correcre/types";

export type SupportInquiryListData = {
  items: SupportInquiryItem[];
  tableAvailable: boolean;
};

export type UpdateSupportInquiryStatusResult = SupportInquiryItem;

export const SUPPORT_INQUIRY_SOURCE_LABELS: Record<SupportInquirySource, string> = {
  ADMIN: "企業側",
  MERCHANT: "提携企業側",
};

export const SUPPORT_INQUIRY_CATEGORY_LABELS: Record<SupportInquiryCategory, string> = {
  LOGIN: "ログイン・招待",
  ACCOUNT: "アカウント・権限",
  MERCHANDISE: "商品・サービス",
  EXCHANGE: "交換管理",
  BILLING: "請求・精算",
  DATA: "データ確認",
  SYSTEM: "不具合・システム",
  OTHER: "その他",
};

export const SUPPORT_INQUIRY_STATUS_LABELS: Record<SupportInquiryStatus, string> = {
  OPEN: "未対応",
  IN_PROGRESS: "対応中",
  RESOLVED: "解決",
};
