import { toYYYYMM } from "@correcre/lib";
import { listUserMonthlyStatsByCompanyAndUser } from "@correcre/lib/dynamodb/user-monthly-stats";
import { readRequiredServerEnv } from "@correcre/lib/env/server";

import type { MonthlyPointsHistoryItem } from "../model/types";

function shiftYearMonth(baseYm: string, monthOffset: number): string {
  const [yearStr, monthStr] = baseYm.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const date = new Date(year, month - 1 + monthOffset, 1);

  return toYYYYMM(date);
}

function listYearMonths(startYearMonth: string, months: number): string[] {
  return Array.from({ length: months }, (_unused, index) => shiftYearMonth(startYearMonth, index));
}

export async function getMonthlyPointsHistoryFromDynamo(
  companyId: string,
  userId: string,
  months = 24,
  endYm?: string,
): Promise<MonthlyPointsHistoryItem[]> {
  const region = readRequiredServerEnv("AWS_REGION");
  const userMonthlyStatsTableName = readRequiredServerEnv("DDB_USER_MONTHLY_STATS_TABLE_NAME");
  const safeMonths = !months || months < 1 || !Number.isFinite(months) ? 24 : months;
  const endYearMonth = endYm ?? shiftYearMonth(toYYYYMM(new Date()), -1);
  const startYearMonth = shiftYearMonth(endYearMonth, -(safeMonths - 1));
  const yearMonths = listYearMonths(startYearMonth, safeMonths);

  const stats = await listUserMonthlyStatsByCompanyAndUser(
    {
      region,
      tableName: userMonthlyStatsTableName,
    },
    companyId,
    userId,
  );
  const statByYearMonth = new Map(stats.map((item) => [item.yearMonth, item]));

  return yearMonths.map((yearMonth) => ({
    yearMonth,
    earnedScore: statByYearMonth.get(yearMonth)?.earnedScore ?? 0,
  }));
}
