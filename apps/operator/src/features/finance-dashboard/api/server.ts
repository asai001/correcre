import "server-only";

import { nowYYYYMM } from "@correcre/lib";
import { calculateMerchantInvoiceYen, resolveExchangeFeePercent } from "@correcre/lib/billing";
import { addMonths, buildCompanyBillingRow, getCompanyBillingStartMonth } from "@correcre/lib/company-billing";
import { listCompanies } from "@correcre/lib/dynamodb/company";
import { listExchangeHistoryByMerchant } from "@correcre/lib/dynamodb/exchange-history";
import { listMerchants } from "@correcre/lib/dynamodb/merchant";
import { getUserByCompanyAndUserId } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import {
  getSalesRecognitionMonth,
  isSalesRecognizedExchange,
  summarizeSalesPendingExchanges,
} from "@correcre/lib/exchange/sales-recognition";
import { joinNameParts } from "@correcre/lib/user-profile";
import type { Company, DBUserItem, ExchangeHistoryItem } from "@correcre/types";

import type {
  CompanyIncomeRow,
  FinanceDashboardData,
  MerchantExpenseRow,
  MerchantPendingRow,
  MonthlyFinance,
} from "../model/types";
import { aggregateMerchantExpense } from "../model/merchant-expense";

type RuntimeConfig = {
  region: string;
  companyTableName: string;
  merchantTableName: string;
  exchangeHistoryTableName: string;
  userTableName: string;
};

// 表示する月数（直近 N か月）。
const MONTH_WINDOW = 12;

function getRuntimeConfig(): RuntimeConfig {
  return {
    region: readRequiredServerEnv("AWS_REGION"),
    companyTableName: readRequiredServerEnv("DDB_COMPANY_TABLE_NAME"),
    merchantTableName: readRequiredServerEnv("DDB_MERCHANT_TABLE_NAME"),
    exchangeHistoryTableName: readRequiredServerEnv("DDB_EXCHANGE_HISTORY_TABLE_NAME"),
    userTableName: readRequiredServerEnv("DDB_USER_TABLE_NAME"),
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
    billableEmployees: billing.billableEmployees,
    monthlyBaseFee: billing.monthlyBaseFee,
    perEmployeeMonthlyFee: billing.perEmployeeMonthlyFee,
    monthlyIncomeYen: billing.amountYen,
    snapshotCapturedAt: company.monthlyBillingSnapshots?.[month]?.capturedAt,
  };
}

function applicantKey(exchange: Pick<ExchangeHistoryItem, "companyId" | "userId">) {
  return `${exchange.companyId}#${exchange.userId}`;
}

async function resolveApplicantNames(
  config: RuntimeConfig,
  exchanges: ExchangeHistoryItem[],
): Promise<Map<string, string>> {
  const keys = new Map(exchanges.map((exchange) => [applicantKey(exchange), exchange]));
  const entries = await Promise.all(
    [...keys].map(async ([key, exchange]) => {
      const user: DBUserItem | null = await getUserByCompanyAndUserId(
        { region: config.region, tableName: config.userTableName },
        exchange.companyId,
        exchange.userId,
      ).catch(() => null);
      const name = user ? joinNameParts(user.lastName, user.firstName) || user.email : undefined;
      return [key, name] as const;
    }),
  );
  return new Map(entries.filter((entry): entry is readonly [string, string] => Boolean(entry[1])));
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

  // 支出: 提携企業ごと・月ごとの支払額（売上 − 交換手数料）。提携企業側の請求額と同じ金額になる。
  const exchangesByMerchant = await Promise.all(
    merchants.map((merchant) =>
      listExchangeHistoryByMerchant(
        { region: config.region, tableName: config.exchangeHistoryTableName },
        merchant.merchantId,
      ),
    ),
  );

  // 内訳に出す申請者の名前。表示対象の月に完了した交換の申請者だけを引く。
  const applicantNames = await resolveApplicantNames(
    config,
    exchangesByMerchant
      .flat()
      .filter((exchange) => isSalesRecognizedExchange(exchange) && monthSet.has(getSalesRecognitionMonth(exchange))),
  );
  const companyNameById = new Map(companies.map((company) => [company.companyId, company.shortName || company.name]));

  const merchantRows: MerchantExpenseRow[] = merchants.map((merchant, index): MerchantExpenseRow => {
    const exchangeFeePercent = resolveExchangeFeePercent(merchant.exchangeFeePercent);
    const { byMonth, totalExpenseYen } = aggregateMerchantExpense({
      exchanges: exchangesByMerchant[index] ?? [],
      exchangeFeePercent,
      months,
      describeApplicant: (exchange) => ({
        applicantName: applicantNames.get(applicantKey(exchange)),
        companyName: companyNameById.get(exchange.companyId),
      }),
    });

    return {
      merchantId: merchant.merchantId,
      merchantName: merchant.name,
      exchangeFeePercent,
      byMonth,
      totalExpenseYen,
    };
  });

  merchantRows.sort((left, right) => right.totalExpenseYen - left.totalExpenseYen);

  // 完了待ちの交換。月の支出には混ぜず、今後の支払予定として別に出す。
  const pendingMerchants: MerchantPendingRow[] = merchants
    .map((merchant, index): MerchantPendingRow => {
      const pending = summarizeSalesPendingExchanges(exchangesByMerchant[index] ?? []);
      return {
        merchantId: merchant.merchantId,
        merchantName: merchant.name,
        count: pending.count,
        amountYen: pending.amountYen,
        estimatedPayableYen: calculateMerchantInvoiceYen(
          pending.amountYen,
          resolveExchangeFeePercent(merchant.exchangeFeePercent),
        ),
      };
    })
    .filter((row) => row.count > 0)
    .sort((left, right) => right.estimatedPayableYen - left.estimatedPayableYen);

  // 月ごとの収支。収入は月次スナップショットを優先し、企業作成前の月には適用しない。
  const monthly: MonthlyFinance[] = months.map((month) => {
    const expenseYen = merchantRows.reduce((sum, row) => sum + (row.byMonth[month]?.payableYen ?? 0), 0);
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
    pendingMerchants,
    monthlyIncomeYen,
  };
}
