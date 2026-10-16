import type { InvoiceIssuer } from "@correcre/lib/company-invoice";

// 導入企業向け請求書の発行元情報（運用者画面の「設定」で編集する）。
export type InvoiceIssuerSettingsData = {
  // 未設定の場合は null（請求書には既定の会社名だけが載る）
  issuer: InvoiceIssuer | null;
  updatedAt?: string;
};
