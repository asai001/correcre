import "server-only";

import { nowYYYYMM } from "@correcre/lib";
import { resolveExchangeFeePercent } from "@correcre/lib/billing";
import { addMonths, buildCompanyBillingRow, getCompanyBillingStartMonth } from "@correcre/lib/company-billing";
import { listCompanies } from "@correcre/lib/dynamodb/company";
import { listExchangeHistoryByMerchant } from "@correcre/lib/dynamodb/exchange-history";
import { listMerchants } from "@correcre/lib/dynamodb/merchant";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { POINT_YEN_VALUE } from "@correcre/lib/points";
import type { Company, ExchangeHistoryStatus } from "@correcre/types";

import type {
  CompanyIncomeRow,
  FinanceDashboardData,
  MerchantExpenseRow,
  MonthlyFinance,
} from "../model/types";

type RuntimeConfig = {
  region: string;
  companyTableName: string;
  merchantTableName: string;
  exchangeHistoryTableName: string;
};

// 表示する月数（直近 N か月）。
const MONTH_WINDOW = 12;

function getRuntimeConfig(): RuntimeConfig {
  return {
    region: readRequiredServerEnv("AWS_REGION"),
    companyTableName: readRequiredServerEnv("DDB_COMPANY_TABLE_NAME"),
    merchantTableName: readRequiredServerEnv("DDB_MERCHANT_TABLE_NAME"),
    exchangeHistoryTableName: readRequiredServerEnv("DDB_EXCHANGE_HISTORY_TABLE_NAME"),
  };
}

// 請求管理と同じく日本時間の月で区切る。
function buildRecentMonths(currentMonth: string, count: number): string[] {
  const months: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    months.push(addMonths(currentMonth, -offset));
  }
  return months;
}

// 却下・キャンセル以外を「ポイントを消費した（＝支出が発生した）交換」とみなす。
function isExpenseExchange(status?: ExchangeHistoryStatus): boolean {
  const normalized = status === "CANCELLED" ? "CANCELED" : status;
  return normalized !== "REJECTED" && normalized !== "CANCELED";
}

function toYearMonth(value: string): string {
  return value.slice(0, 7);
}

// 収入は請求管理（導入企業への月額利用料の請求）と同じ計算を使う。
function buildCompanyIncomeRowForMonth(company: Company, month: string, currentMonth: string): CompanyIncomeRow | null {
  const startMonth = getCompanyBillingStartMonth(company);
  if (startMonth && month < startMonth) {
    return null;
  }

  const billing = buildCompanyBillingRow(company, month, currentMonth);
  if (!billing.billable) {
    return null;
  }

  return {
    companyId: company.companyId,
    companyName: company.shortName || company.name,
    status: billing.status,
    month,
    activeEmployees: billing.activeEmployees,
    monthlyBaseFee: billing.monthlyBaseFee,
    perEmployeeMonthlyFee: billing.perEmployeeMonthlyFee,
    monthlyIncomeYen: billing.amountYen,
    snapshotCapturedAt: company.monthlyBillingSnapshots?.[month]?.capturedAt,
  };
}

export async function getFinanceDashboardData(): Promise<FinanceDashboardData> {
  const config = getRuntimeConfig();
  const months = buildRecentMonths(nowYYYYMM(), MONTH_WINDOW);
  const monthSet = new Set(months);

  const [companies, merchants] = await Promise.all([
    listCompanies({ region: config.region, tableName: config.companyTableName }),
    listMerchants({ region: config.region, tableName: config.merchantTableName }),
  ]);

  const currentMonth = months[months.length - 1] ?? "";

  // 収入: 導入企業ごとの月額利用料（請求金額）。
  const companyIncomeByMonth = Object.fromEntries(
    months.map((month) => [
      month,
      companies
        .map((company) => buildCompanyIncomeRowForMonth(company, month, currentMonth))
        .filter((row): row is CompanyIncomeRow => row !== null)
        .sort((left, right) => right.monthlyIncomeYen - left.monthlyIncomeYen),
    ]),
  );
  const monthlyIncomeByMonth = Object.fromEntries(
    months.map((month) => [
      month,
      (companyIncomeByMonth[month] ?? []).reduce((sum, row) => sum + row.monthlyIncomeYen, 0),
    ]),
  );
  const companyRows = companyIncomeByMonth[currentMonth] ?? [];
  const monthlyIncomeYen = monthlyIncomeByMonth[currentMonth] ?? 0;

  // 支出: 提携企業ごと・月ごと。
  const merchantRows: MerchantExpenseRow[] = await Promise.all(
    merchants.map(async (merchant): Promise<MerchantExpenseRow> => {
      const exchanges = await listExchangeHistoryByMerchant(
        { region: config.region, tableName: config.exchangeHistoryTableName },
        merchant.merchantId,
      );

      const byMonth: Record<string, number> = {};
      let totalExpenseYen = 0;

      for (const exchange of exchanges) {
        if (!isExpenseExchange(exchange.status)) {
          continue;
        }
        const amount = (exchange.usedPoint ?? 0) * POINT_YEN_VALUE;
        totalExpenseYen += amount;

        const month = toYearMonth(exchange.exchangedAt);
        if (monthSet.has(month)) {
          byMonth[month] = (byMonth[month] ?? 0) + amount;
        }
      }

      return {
        merchantId: merchant.merchantId,
        merchantName: merchant.name,
        exchangeFeePercent: resolveExchangeFeePercent(merchant.exchangeFeePercent),
        byMonth,
        totalExpenseYen,
      };
    }),
  );

  merchantRows.sort((left, right) => right.totalExpenseYen - left.totalExpenseYen);

  // 月ごとの収支。収入は月次スナップショットを優先し、企業作成前の月には適用しない。
  const monthly: MonthlyFinance[] = months.map((month) => {
    const expenseYen = merchantRows.reduce((sum, row) => sum + (row.byMonth[month] ?? 0), 0);
    const incomeYen = monthlyIncomeByMonth[month] ?? 0;
    return {
      month,
      incomeYen,
      expenseYen,
      balanceYen: incomeYen - expenseYen,
    };
  });

  return {
    months,
    monthly,
    companies: companyRows,
    companyIncomeByMonth,
    monthlyIncomeByMonth,
    merchants: merchantRows,
    monthlyIncomeYen,
  };
}
