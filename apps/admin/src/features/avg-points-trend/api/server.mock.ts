import data from "../../../../../mock/dynamodb.json";
import { toYYYYMM } from "@correcre/lib";
import type { AvgPointsTrendItem } from "../model/types";

/** YYYY-MM を monthOffset だけずらす（-1 → 前月など） */
function shiftYearMonth(baseYm: string, monthOffset: number): string {
  const [yStr, mStr] = baseYm.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = new Date(y, m - 1 + monthOffset, 1);
  return toYYYYMM(d); // YYYY-MM 形式で返す
}

async function getMonthlyStatsBetweenTargetMonth(companyId: string, startYearMonth: string, endYearMonth: string) {
  const Items = data.UserMonthlyStats;

  if (!Items) {
    return null;
  }

  const found = Items.filter(
    (i) => i.companyUserKey.startsWith(`${companyId}#`) && i.yearMonth >= startYearMonth && i.yearMonth <= endYearMonth
  );
  return found ?? null;
}

/**
 * 企業の「過去 N ヶ月の平均獲得点数推移」を返す
 * endYm が指定されない場合は「現在日付の属する月」を終端として扱う
 */
export async function getAvgPointsTrendFromDynamoMock(
  companyId: string,
  months = 12,
  endYm?: string
): Promise<AvgPointsTrendItem[] | null> {
  const safeMonths = !months || months < 1 || !Number.isFinite(months) ? 12 : months; // monthsParam が Nan や負数の場合の考慮
  const endYearMonth = endYm ?? shiftYearMonth(toYYYYMM(new Date()), -1);
  const startYearMonth = shiftYearMonth(endYearMonth, -(safeMonths - 1));

  const stats = await getMonthlyStatsBetweenTargetMonth(companyId, startYearMonth, endYearMonth);
  if (!stats) {
    return null;
  }

  // 集計: yearMonth ごとに earnedScore の平均
  const aggregate: Record<string, { sum: number; count: number }> = {};
  for (const s of stats) {
    const ym = s.yearMonth;
    if (!aggregate[ym]) {
      aggregate[ym] = { sum: 0, count: 0 };
    }
    aggregate[ym].sum += s.earnedScore;
    aggregate[ym].count += 1;
  }

  // 期間内の全ての month を列挙し、欠損は 0 とする
  const items: AvgPointsTrendItem[] = [];
  let cursor = startYearMonth;
  while (true) {
    const ag = aggregate[cursor];
    const avg = ag ? ag.sum / ag.count : 0;
    items.push({ yearMonth: cursor, avgEarnedScore: Math.round(avg * 100) / 100 });
    if (cursor === endYearMonth) break;
    cursor = shiftYearMonth(cursor, 1);
  }

  return items;
}
