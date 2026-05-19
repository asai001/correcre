import { toYYYYMM } from "@correcre/lib";
import { listUserMonthlyStatsByCompany } from "@correcre/lib/dynamodb/user-monthly-stats";
import { readRequiredServerEnv } from "@correcre/lib/env/server";

import type { AvgPointsTrendItem } from "../model/types";

function shiftYearMonth(baseYm: string, monthOffset: number): string {
  const [yearStr, monthStr] = baseYm.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const date = new Date(year, month - 1 + monthOffset, 1);

  return toYYYYMM(date);
}

export async function getAvgPointsTrendFromDynamo(
  companyId: string,
  months = 12,
  endYm?: string,
): Promise<AvgPointsTrendItem[] | null> {
  const safeMonths = !months || months < 1 || !Number.isFinite(months) ? 12 : months;
  const endYearMonth = endYm ?? shiftYearMonth(toYYYYMM(new Date()), -1);
  const startYearMonth = shiftYearMonth(endYearMonth, -(safeMonths - 1));
  const stats = await listUserMonthlyStatsByCompany(
    {
      region: readRequiredServerEnv("AWS_REGION"),
      tableName: readRequiredServerEnv("DDB_USER_MONTHLY_STATS_TABLE_NAME"),
    },
    companyId,
  );

  const aggregate = new Map<string, { sum: number; count: number }>();
  for (const stat of stats) {
    if (stat.yearMonth < startYearMonth || stat.yearMonth > endYearMonth) {
      continue;
    }

    const current = aggregate.get(stat.yearMonth) ?? { sum: 0, count: 0 };
    current.sum += stat.earnedScore;
    current.count += 1;
    aggregate.set(stat.yearMonth, current);
  }

  const items: AvgPointsTrendItem[] = [];
  let cursor = startYearMonth;
  while (true) {
    const current = aggregate.get(cursor);
    const avg = current ? current.sum / current.count : 0;
    items.push({
      yearMonth: cursor,
      avgEarnedScore: Math.round(avg * 100) / 100,
    });

    if (cursor === endYearMonth) {
      break;
    }

    cursor = shiftYearMonth(cursor, 1);
  }

  return items;
}
