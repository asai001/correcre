import "server-only";

import { resolveExchangeFeePercent } from "@correcre/lib/billing";
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

function buildRecentMonths(count: number): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
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

function getCompanyStartMonth(company: Company): string | null {
  const source = company.contractStartsAt || company.createdAt;
  return source ? toYearMonth(source) : null;
}

function buildCompanyIncomeRowForMonth(company: Company, month: string): CompanyIncomeRow | null {
  const startMonth = getCompanyStartMonth(company);
  if (startMonth && month < startMonth) {
    return null;
  }

  const snapshot = company.monthlyBillingSnapshots?.[month];
  const status = snapshot?.status ?? company.status;

  if (status === "INACTIVE") {
    return null;
  }

  const activeEmployees = snapshot?.activeEmployees ?? company.activeEmployees ?? 0;
  const perEmployeeMonthlyFee = snapshot?.perEmployeeMonthlyFee ?? company.perEmployeeMonthlyFee ?? 0;
  const monthlyIncomeYen = snapshot?.monthlyIncomeYen ?? activeEmployees * perEmployeeMonthlyFee;

  return {
    companyId: company.companyId,
    companyName: company.shortName || company.name,
    status,
    month,
    activeEmployees,
    perEmployeeMonthlyFee,
    monthlyIncomeYen,
    snapshotCapturedAt: snapshot?.capturedAt,
  };
}

export async function getFinanceDashboardData(): Promise<FinanceDashboardData> {
  const config = getRuntimeConfig();
  const months = buildRecentMonths(MONTH_WINDOW);
  const monthSet = new Set(months);

  const [companies, merchants] = await Promise.all([
    listCompanies({ region: config.region, tableName: config.companyTableName }),
    listMerchants({ region: config.region, tableName: config.merchantTableName }),
  ]);

  // 収入: 導入企業ごとの月次スナップショット。未作成月は 0 として扱う。
  const companyIncomeByMonth = Object.fromEntries(
    months.map((month) => [
      month,
      companies
        .map((company) => buildCompanyIncomeRowForMonth(company, month))
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
  const currentMonth = months[months.length - 1] ?? "";
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
