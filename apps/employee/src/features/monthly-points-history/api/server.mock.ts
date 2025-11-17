import type { UserMonthlyStatsRecord } from "../model/types";
import data from "../../../../../mock/dynamodb.json";
import { toYYYYMM } from "@correcre/lib";

/** YYYY-MM を monthOffset だけずらす（-1 → 前月など） */
function shiftYearMonth(baseYm: string, monthOffset: number): string {
  const [yStr, mStr] = baseYm.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = new Date(y, m - 1 + monthOffset, 1);
  return toYYYYMM(d); // YYYY-MM 形式で返す
}

/**
 * 指定した年月の UserMonthlyStats を 1件だけ取得
 */
// function getMonthlyStats(companyId: string, userId: string, targetYearMonth: string): UserMonthlyStatsRecord | null {
//   const Items = (data as any).UserMonthlyStats as UserMonthlyStatsRecord[] | undefined;

//   if (!Items) {
//     return null;
//   }

//   const key = `${companyId}#${userId}`;

//   const found = Items.find((i) => i.companyUserKey === key && i.yearMonth === targetYearMonth);
//   return found ?? null;
// }

function getMonthlyStatsBetweenTargetMonth(companyId: string, userId: string, startYearMonth: string, endYearMonth: string) {
  const Items = (data as any).UserMonthlyStats as UserMonthlyStatsRecord[] | undefined;

  if (!Items) {
    return null;
  }

  const key = `${companyId}#${userId}`;

  const found = Items.filter((i) => i.companyUserKey === key && i.yearMonth >= startYearMonth && i.yearMonth <= endYearMonth);
  return found ?? null;
}

/**
 * ユーザーの「過去 N ヶ月の月間獲得ポイント推移」を返す
 * endYm が指定されない場合は「現在日付の属する月」を終端として扱う
 */
export async function getMonthlyPointsHistoryFromDynamoMock(
  companyId: string,
  userId: string,
  months = 24,
  endYm?: string
): Promise<UserMonthlyStatsRecord[] | null> {
  const endYearMonth = endYm ?? toYYYYMM(new Date());
  const startYearMonth = shiftYearMonth(endYearMonth, -(months - 1));

  const res = getMonthlyStatsBetweenTargetMonth(companyId, userId, startYearMonth, endYearMonth);

  //   const out: MonthlyPointsHistoryItem[] = [];

  //   // 古い月 ⇒ 新しい月の順になるよう、(months - 1) ヶ月前から順番に埋める
  //   for (let i = months - 1; i >= 0; i -= 1) {
  //     const ym = shiftYearMonth(endYearMonth, -i);
  //     const stats = getMonthlyStats(companyId, userId, ym);

  //     out.push({
  //       yearMonth: ym,
  //       earnedPoints: stats?.earnedPoints ?? 0,
  //     });
  //   }

  return res;
}
