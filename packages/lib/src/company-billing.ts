import type { Company } from "@correcre/types";

import { toYYYYMM } from "./date/format";

// 導入企業への月額利用料の請求（運用者 → 導入企業）に関する計算。
// 金額 ＝ 月額基本料 + 利用人数（ACTIVE のユーザー数）× 月額単価（ID 料金）。無効（INACTIVE）の月は請求しない。
// サーバー・クライアントのどちらからも使えるよう、DB アクセスは持たない純粋関数のみを置く。

// 請求スケジュール。契約書の「月末締め・翌月 15 日払い」に合わせている。
// 請求日（締め日）＝ 対象月の末日、支払期限 ＝ 翌月の PAYMENT_DUE_DAY 日。
export const BILLING_PAYMENT_DUE_DAY = 15;

// 請求履歴として遡る最大月数（当月を含む）。
export const BILLING_HISTORY_MAX_MONTHS = 24;

export type CompanyBillingStatus = Company["status"];

// 金額の根拠となったデータ。
// - live: 当月。現在の会社設定・利用人数から算出（月末まで変動する見込み額）
// - snapshot: その月に保存された月次スナップショット
// - carried: その月のスナップショットがないため、直前の月のスナップショットを引き継いだ（月内に変更がなかった月）
// - estimated: スナップショット導入前などで参照できる記録がないため、現在の設定値で補完した
export type CompanyBillingSource = "live" | "snapshot" | "carried" | "estimated";

export type CompanyBillingRow = {
  month: string; // 請求対象月 YYYY-MM
  status: CompanyBillingStatus;
  activeEmployees: number;
  monthlyBaseFee: number;
  perEmployeeMonthlyFee: number;
  employeeFeeYen: number; // 利用人数 × 月額単価
  amountYen: number; // 請求金額
  billable: boolean; // 無効の月は false（金額 0）
  billingDate: string; // 請求日（締め日） YYYY-MM-DD
  paymentDueDate: string; // 支払期限 YYYY-MM-DD
  finalized: boolean; // 対象月が終わって金額が確定しているか
  source: CompanyBillingSource;
};

type BillingCompany = Pick<
  Company,
  | "status"
  | "monthlyBaseFee"
  | "perEmployeeMonthlyFee"
  | "activeEmployees"
  | "monthlyBillingSnapshots"
  | "contractStartsAt"
  | "createdAt"
>;

const YEAR_MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

function parseYearMonth(month: string): { year: number; month: number } {
  const match = YEAR_MONTH_PATTERN.exec(month);
  if (!match) {
    throw new Error(`Invalid year-month: ${month}`);
  }
  return { year: Number(match[1]), month: Number(match[2]) };
}

function formatYearMonth(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toNonNegativeInteger(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

export function addMonths(month: string, offset: number): string {
  const parsed = parseYearMonth(month);
  const index = parsed.year * 12 + (parsed.month - 1) + offset;
  return formatYearMonth(Math.floor(index / 12), (index % 12) + 1);
}

// 対象月の請求日（締め日 ＝ 月末日）。
export function getBillingDate(month: string): string {
  const { year, month: mon } = parseYearMonth(month);
  const lastDay = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  return `${year}-${pad2(mon)}-${pad2(lastDay)}`;
}

// 対象月の支払期限（翌月 15 日）。
export function getPaymentDueDate(month: string): string {
  return `${addMonths(month, 1)}-${pad2(BILLING_PAYMENT_DUE_DAY)}`;
}

export function calculateCompanyBillingAmount(params: {
  status: CompanyBillingStatus;
  activeEmployees: number;
  monthlyBaseFee?: number;
  perEmployeeMonthlyFee: number;
}) {
  const activeEmployees = toNonNegativeInteger(params.activeEmployees);
  const monthlyBaseFee = toNonNegativeInteger(params.monthlyBaseFee);
  const perEmployeeMonthlyFee = toNonNegativeInteger(params.perEmployeeMonthlyFee);
  const billable = params.status !== "INACTIVE";
  const employeeFeeYen = billable ? activeEmployees * perEmployeeMonthlyFee : 0;

  return {
    activeEmployees,
    monthlyBaseFee,
    perEmployeeMonthlyFee,
    employeeFeeYen,
    amountYen: billable ? monthlyBaseFee + employeeFeeYen : 0,
    billable,
  };
}

// 請求開始月（契約開始日、なければ企業作成日の月。日本時間）。
export function getCompanyBillingStartMonth(company: BillingCompany): string | null {
  const source = company.contractStartsAt || company.createdAt;
  if (!source) {
    return null;
  }
  // 日付のみ（YYYY-MM-DD）はタイムゾーン変換せずそのまま月を取る。
  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) {
    return source.slice(0, 7);
  }
  const date = new Date(source);
  return Number.isNaN(date.getTime()) ? null : toYYYYMM(date);
}

function findLatestSnapshotBefore(company: BillingCompany, month: string) {
  const snapshots = company.monthlyBillingSnapshots ?? {};
  let latestMonth: string | null = null;
  for (const key of Object.keys(snapshots)) {
    if (key < month && (latestMonth === null || key > latestMonth)) {
      latestMonth = key;
    }
  }
  return latestMonth ? snapshots[latestMonth] : undefined;
}

// 指定した月の請求行を組み立てる。
export function buildCompanyBillingRow(company: BillingCompany, month: string, currentMonth: string): CompanyBillingRow {
  let source: CompanyBillingSource;
  let values: {
    status: CompanyBillingStatus;
    activeEmployees: number;
    monthlyBaseFee?: number;
    perEmployeeMonthlyFee: number;
  };

  if (month >= currentMonth) {
    // 当月（以降）は現在の設定・利用人数で算出する。会社レコードの activeEmployees はユーザー変更のたびに更新される。
    source = "live";
    values = {
      status: company.status,
      activeEmployees: company.activeEmployees ?? 0,
      monthlyBaseFee: company.monthlyBaseFee,
      perEmployeeMonthlyFee: company.perEmployeeMonthlyFee ?? 0,
    };
  } else {
    // 過去月はその月の最後のスナップショット。なければ直前のスナップショットを引き継ぐ
    // （スナップショットは変更があった月にしか書かれないため）。
    const snapshot = company.monthlyBillingSnapshots?.[month];
    const previous = snapshot ? undefined : findLatestSnapshotBefore(company, month);
    const base = snapshot ?? previous;

    if (base) {
      source = snapshot ? "snapshot" : "carried";
      values = {
        status: base.status,
        activeEmployees: base.activeEmployees,
        // 基本料導入前のスナップショットには monthlyBaseFee がない（＝基本料 0 円の時期）。
        monthlyBaseFee: base.monthlyBaseFee,
        perEmployeeMonthlyFee: base.perEmployeeMonthlyFee,
      };
    } else {
      source = "estimated";
      values = {
        status: company.status,
        activeEmployees: company.activeEmployees ?? 0,
        monthlyBaseFee: company.monthlyBaseFee,
        perEmployeeMonthlyFee: company.perEmployeeMonthlyFee ?? 0,
      };
    }
  }

  const amount = calculateCompanyBillingAmount(values);

  return {
    month,
    status: values.status,
    ...amount,
    billingDate: getBillingDate(month),
    paymentDueDate: getPaymentDueDate(month),
    finalized: month < currentMonth,
    source,
  };
}

// 請求開始月から当月までの請求履歴（新しい月が先頭）。最大 maxMonths か月分。
export function buildCompanyBillingHistory(
  company: BillingCompany,
  options: {
    currentMonth: string;
    maxMonths?: number;
  },
): CompanyBillingRow[] {
  const { currentMonth } = options;
  const maxMonths = options.maxMonths ?? BILLING_HISTORY_MAX_MONTHS;
  const startMonth = getCompanyBillingStartMonth(company);
  const oldestMonth = addMonths(currentMonth, -(maxMonths - 1));
  const fromMonth = startMonth && startMonth > oldestMonth ? startMonth : oldestMonth;

  const rows: CompanyBillingRow[] = [];
  for (let month = currentMonth; month >= fromMonth; month = addMonths(month, -1)) {
    rows.push(buildCompanyBillingRow(company, month, currentMonth));
  }
  return rows;
}
