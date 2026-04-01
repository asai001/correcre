import { isValidYYYYMM, toYYYYMM } from "@correcre/lib";
import { getCompanyById } from "@correcre/lib/dynamodb/company";
import { listExchangeHistoryByCompany } from "@correcre/lib/dynamodb/exchange-history";
import { listUserMonthlyStatsByCompany } from "@correcre/lib/dynamodb/user-monthly-stats";
import { readRequiredServerEnv } from "@correcre/lib/env/server";

import type { DashboardSummary } from "../model/types";

function shiftYearMonth(baseYm: string, monthOffset: number) {
  const [year, month] = baseYm.split("-").map(Number);
  const date = new Date(year, month - 1 + monthOffset, 1);

  return toYYYYMM(date);
}

export async function getDashboardSummaryFromDynamo(
  companyId: string,
  _userId: string,
  targetYearMonth: string,
): Promise<DashboardSummary | null> {
  if (!isValidYYYYMM(targetYearMonth)) {
    return null;
  }

  const region = readRequiredServerEnv("AWS_REGION");
  const lastYearMonth = shiftYearMonth(targetYearMonth, -1);

  const [stats, exchangeHistory, company] = await Promise.all([
    listUserMonthlyStatsByCompany(
      {
        region,
        tableName: readRequiredServerEnv("DDB_USER_MONTHLY_STATS_TABLE_NAME"),
      },
      companyId,
    ),
    listExchangeHistoryByCompany(
      {
        region,
        tableName: readRequiredServerEnv("DDB_EXCHANGE_HISTORY_TABLE_NAME"),
      },
      companyId,
    ),
    getCompanyById(
      {
        region,
        tableName: readRequiredServerEnv("DDB_COMPANY_TABLE_NAME"),
      },
      companyId,
    ),
  ]);

  const lastMonthEarnedPoints = stats
    .filter((item) => item.yearMonth === lastYearMonth)
    .reduce((sum, item) => sum + item.earnedPoints, 0);
  const thisMonthExchangePoints = exchangeHistory
    .filter((item) => item.exchangedAt.slice(0, 7) === targetYearMonth)
    .reduce((sum, item) => sum + item.usedPoint, 0);

  return {
    lastMonthEarnedPoints,
    thisMonthExchangePoints,
    currentCompanyPointBalance: company?.companyPointBalance ?? 0,
  };
}
