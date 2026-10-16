import type { InvoiceIssuerSettingItem } from "@correcre/types";

import type { CompanyBillingRow } from "./company-billing";

// 導入企業向けの請求書（運用者 → 導入企業の月額利用料）。税理士などから求められることが多いのは
// 領収書ではなく請求書のため、導入企業の管理者が「請求情報」から自分で出力できるようにする（2026-10-14 定例）。
// DB アクセスを持たない純関数だけを置き、画面（サーバー・クライアント）とテストから共通に使う。

// 月額基本料・ID料金は税込みで登録している（企業登録画面の案内どおり）。請求書には税込金額と、
// うち消費税（10% 対象）を内訳として載せる。
export const INVOICE_TAX_RATE_PERCENT = 10;

// 発行元情報が未設定のときに使う会社名（提携企業向け規約・運用会社と同じ）。
export const DEFAULT_INVOICE_ISSUER_NAME = "em株式会社";

export type InvoiceIssuer = Omit<InvoiceIssuerSettingItem, "settingKey" | "updatedAt" | "updatedBy">;

// 保存済みの設定アイテムから、請求書に載せる項目だけを取り出す。
export function toInvoiceIssuer(item: InvoiceIssuerSettingItem): InvoiceIssuer {
  return {
    companyName: item.companyName,
    postalCode: item.postalCode,
    address: item.address,
    phone: item.phone,
    email: item.email,
    registrationNumber: item.registrationNumber,
    bankAccount: item.bankAccount,
    note: item.note,
  };
}

export type CompanyInvoiceLine = {
  label: string;
  quantity: number;
  unit: string;
  unitPriceYen: number;
  amountYen: number;
};

export type CompanyInvoice = {
  invoiceNumber: string;
  month: string; // 請求対象月 YYYY-MM
  issueDate: string; // 請求日 YYYY-MM-DD
  paymentDueDate: string; // お支払期限 YYYY-MM-DD
  lines: CompanyInvoiceLine[];
  totalYen: number; // 税込合計
  taxRatePercent: number;
  consumptionTaxYen: number; // 合計のうち消費税
};

// 税込金額に含まれる消費税（端数切り捨て）。
export function calculateIncludedConsumptionTax(amountYen: number, ratePercent = INVOICE_TAX_RATE_PERCENT): number {
  if (!Number.isFinite(amountYen) || amountYen <= 0) {
    return 0;
  }
  return Math.floor((amountYen * ratePercent) / (100 + ratePercent));
}

// 請求書番号。企業と対象月から一意に決まるので、何度出力しても同じ番号になる。
export function buildCompanyInvoiceNumber(companyId: string, month: string): string {
  const companyPart = companyId.replace(/[^0-9A-Za-z]/g, "").slice(0, 8).toUpperCase() || "COMPANY";
  return `${month.replace("-", "")}-${companyPart}`;
}

// 請求書を出力できる月か。金額が確定した（対象月が終わった）請求対象の月だけ。
// 当月分は月末まで利用人数・料金が変わりうるため、確定前の金額で請求書を出さない。
export function canIssueCompanyInvoice(row: Pick<CompanyBillingRow, "billable" | "finalized" | "amountYen">): boolean {
  return row.billable && row.finalized && row.amountYen > 0;
}

export function buildCompanyInvoice(companyId: string, row: CompanyBillingRow): CompanyInvoice | null {
  if (!canIssueCompanyInvoice(row)) {
    return null;
  }

  const lines: CompanyInvoiceLine[] = [];
  if (row.monthlyBaseFee > 0) {
    lines.push({
      label: "月額基本料",
      quantity: 1,
      unit: "式",
      unitPriceYen: row.monthlyBaseFee,
      amountYen: row.monthlyBaseFee,
    });
  }
  if (row.employeeFeeYen > 0) {
    lines.push({
      label: "ID料金",
      quantity: row.activeEmployees,
      unit: "人",
      unitPriceYen: row.perEmployeeMonthlyFee,
      amountYen: row.employeeFeeYen,
    });
  }

  return {
    invoiceNumber: buildCompanyInvoiceNumber(companyId, row.month),
    month: row.month,
    issueDate: row.billingDate,
    paymentDueDate: row.paymentDueDate,
    lines,
    totalYen: row.amountYen,
    taxRatePercent: INVOICE_TAX_RATE_PERCENT,
    consumptionTaxYen: calculateIncludedConsumptionTax(row.amountYen),
  };
}

// ---- 発行元情報の入力検証 -------------------------------------------------------

const REGISTRATION_NUMBER_PATTERN = /^T\d{13}$/;
const POSTAL_CODE_PATTERN = /^\d{3}-?\d{4}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELD_MAX_LENGTH: Record<keyof InvoiceIssuer, number> = {
  companyName: 100,
  postalCode: 8,
  address: 200,
  phone: 20,
  email: 254,
  registrationNumber: 14,
  bankAccount: 300,
  note: 500,
};

const FIELD_LABELS: Record<keyof InvoiceIssuer, string> = {
  companyName: "会社名",
  postalCode: "郵便番号",
  address: "住所",
  phone: "電話番号",
  email: "メールアドレス",
  registrationNumber: "登録番号",
  bankAccount: "お振込先",
  note: "備考",
};

export type InvoiceIssuerValidationResult = { ok: true; issuer: InvoiceIssuer } | { ok: false; error: string };

// 運用者画面から受け取った発行元情報を検証・正規化する。空欄は未設定（undefined）にする。
export function normalizeInvoiceIssuerInput(input: unknown): InvoiceIssuerValidationResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "入力内容が正しくありません。" };
  }

  const raw = input as Record<string, unknown>;
  const issuer: Record<string, string | undefined> = {};

  for (const key of Object.keys(FIELD_MAX_LENGTH) as (keyof InvoiceIssuer)[]) {
    const value = raw[key];
    if (value !== undefined && value !== null && typeof value !== "string") {
      return { ok: false, error: `${FIELD_LABELS[key]}の形式が正しくありません。` };
    }
    // 1 行項目は前後の空白を落とす。振込先・備考は改行を残す
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (trimmed.length > FIELD_MAX_LENGTH[key]) {
      return { ok: false, error: `${FIELD_LABELS[key]}は${FIELD_MAX_LENGTH[key]}文字以内で入力してください。` };
    }
    issuer[key] = trimmed || undefined;
  }

  if (!issuer.companyName) {
    return { ok: false, error: "会社名を入力してください。" };
  }
  if (issuer.registrationNumber) {
    issuer.registrationNumber = issuer.registrationNumber.toUpperCase();
    if (!REGISTRATION_NUMBER_PATTERN.test(issuer.registrationNumber)) {
      return { ok: false, error: "登録番号は「T」と13桁の数字で入力してください（例: T1234567890123）。" };
    }
  }
  if (issuer.postalCode && !POSTAL_CODE_PATTERN.test(issuer.postalCode)) {
    return { ok: false, error: "郵便番号は「123-4567」の形式で入力してください。" };
  }
  if (issuer.email && !EMAIL_PATTERN.test(issuer.email)) {
    return { ok: false, error: "メールアドレスの形式が正しくありません。" };
  }

  return { ok: true, issuer: issuer as InvoiceIssuer };
}
