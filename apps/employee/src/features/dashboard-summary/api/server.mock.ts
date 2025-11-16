import { DashboardSummary } from "../model/types";
import data from "../../../../mock/dynamodb.json";

import { isValidYYYYMM, toYYYYMM } from "@correcre/lib";

/** YYYY-MM を monthOffset だけずらす（-1 → 前月など） */
function shiftYearMonth(baseYm: string, monthOffset: number): string {
  const [yStr, mStr] = baseYm.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = new Date(y, m - 1 + monthOffset, 1);
  return toYYYYMM(d); // ここは YYYY-MM 形式を返す前提
}

async function getUser(companyId: string, userId: string) {
  const Items = data.User;
  const Item = Items.find((i) => i.companyId === companyId && i.userId === userId);

  if (!Item) {
    return null;
  }

  return Item;
}

/**
 * 任意の月のマンスリーデータを取得
 *
 * @param companyId
 * @param userId
 * @param targetYearMonth YYYY-MM 形式
 * @returns
 */
async function getMonthlyStats(companyId: string, userId: string, targetYearMonth: string) {
  if (!isValidYYYYMM(targetYearMonth)) {
    return null;
  }

  const Items = data.UserMonthlyStats;
  const Item = Items.find((i) => i.companyUserKey === `${companyId}#${userId}` && i.yearMonth === targetYearMonth);

  if (!Item) {
    return null;
  }

  return Item;
}

/**
 * ユーザーの任意の月のミッション報告レポートを取得
 * @param companyId
 * @param userId
 * @param targetYearMonth YYYY-MM 形式
 * @returns
 */
async function getMissionReports(companyId: string, userId: string, targetYearMonth: string) {
  if (!isValidYYYYMM(targetYearMonth)) {
    return null;
  }

  const Items = data.MissionReports;
  return Items.filter(
    (i) =>
      i.companyId === companyId && i.userId === userId && i.status === "APPROVED" && targetYearMonth === toYYYYMM(new Date(i.reportedAt))
  );
}

/**
 * 対象ユーザーのダッシュボードサマリーを返す
 *
 * @param companyId
 * @param userId
 * @param targetYearMonth YYYY-MM 形式
 * @returns
 */
export const getDashboardSummaryFromDynamoMock = async (
  companyId: string,
  userId: string,
  targetYearMonth: string
): Promise<DashboardSummary | null> => {
  if (!isValidYYYYMM(targetYearMonth)) {
    return null;
  }

  const lastYearMonth = shiftYearMonth(targetYearMonth, -1);

  const [missionReports, userSnapshot, lastMonthStats] = await Promise.all([
    getMissionReports(companyId, userId, targetYearMonth),
    getUser(companyId, userId),
    getMonthlyStats(companyId, userId, lastYearMonth),
  ]);

  const totalScore = missionReports?.reduce((acc, cur) => acc + cur.scoreGranted, 0);
  const thisMonthCompletionRate = totalScore ? (totalScore / 100) * 100 : 0; // 現状、報告件数 = 達成割合みたいな感じになっている

  return {
    thisMonthCompletionRate,
    currentPointBalance: userSnapshot?.currentPointBalance ?? 0,
    lastMonthEarnedPoints: lastMonthStats?.earnedPoints ?? 0,
  };
};
