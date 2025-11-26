import { DashboardSummary } from "../model/types";
import data from "../../../../../mock/dynamodb.json";

import { isValidYYYYMM, toYYYYMM } from "@correcre/lib";

/** YYYY-MM を monthOffset だけずらす（-1 → 前月など） */
function shiftYearMonth(baseYm: string, monthOffset: number): string {
  const [yStr, mStr] = baseYm.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = new Date(y, m - 1 + monthOffset, 1);
  return toYYYYMM(d); // ここは YYYY-MM 形式を返す前提
}

async function getUserMonthlyStatsOfCompany(companyId: string, targetYearMonth: string) {
  if (!isValidYYYYMM(targetYearMonth)) {
    return null;
  }

  const Items = data.UserMonthlyStats;
  // companyUserKey は "companyId#userId" の形式
  return Items.filter((i) => i.companyUserKey.startsWith(`${companyId}#`) && i.yearMonth === targetYearMonth);
}

async function getExchangeHistoryOfCompany(companyId: string, targetYearMonth: string) {
  if (!isValidYYYYMM(targetYearMonth)) {
    return null;
  }

  const Items = data.ExchangeHistory;
  return Items.filter((i) => i.companyId === companyId && targetYearMonth === toYYYYMM(new Date(i.exchangedAt)));
}

async function getCompany(companyId: string) {
  const Items = data.Company;
  return Items.find((i) => i.companyId === companyId);
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

  const [userMonthlyStats, exchangeHistory, company] = await Promise.all([
    getUserMonthlyStatsOfCompany(companyId, lastYearMonth),
    getExchangeHistoryOfCompany(companyId, targetYearMonth),
    getCompany(companyId),
  ]);

  // 【修正意図】先月総獲得ポイントの正しい計算
  // 以前は MissionReports から scoreGranted を集計し、perEmployeeMonthlyFee で計算していた。
  // これだと、月額費用が変わると過去のポイントまで変わってしまう問題があった。
  //
  // 正しくは、UserMonthlyStats の earnedPoints を集計すべき。
  // なぜなら：
  // 1. ポイントは報告時に確定した値として UserMonthlyStats.earnedPoints に記録されている
  // 2. 月額費用が変更されても、過去のポイントは変わらない（確定値）
  // 3. ポイントは1ポイント=5円で固定、変換レートのみが月額費用で決まる
  const lastMonthEarnedPoints = userMonthlyStats?.reduce((acc: number, cur) => acc + (cur.earnedPoints ?? 0), 0) ?? 0;
  const thisMonthExchangePoints = exchangeHistory?.reduce((acc: number, cur) => acc + cur.usedPoint, 0) ?? 0;

  return {
    lastMonthEarnedPoints,
    thisMonthExchangePoints,
    currentCompanyPointBalance: company?.companyPointBalance ?? 0,
  };
};
