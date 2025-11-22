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

async function getMissionReportOfCompany(companyId: string, targetYearMonth: string) {
  if (!isValidYYYYMM(targetYearMonth)) {
    return null;
  }

  const Items = data.MissionReports;
  return Items.filter((i) => i.companyId === companyId && i.status === "APPROVED" && targetYearMonth === toYYYYMM(new Date(i.reportedAt)));
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

  const [missionReports, exchangeHistory, company] = await Promise.all([
    getMissionReportOfCompany(companyId, lastYearMonth),
    getExchangeHistoryOfCompany(companyId, targetYearMonth),
    getCompany(companyId),
  ]);

  const pointPerScore = (company?.perEmployeeMonthlyFee ?? 0) / 100 / 5; // 一点あたりのポイント
  const lastMonthEarnedScore = missionReports?.reduce((acc, cur) => acc + cur.scoreGranted, 0) ?? 0; // 総獲得スコア（点）
  const lastMonthEarnedPoints = lastMonthEarnedScore * pointPerScore; // 点 ⇔ スコア 変換
  const thisMonthExchangePoints = exchangeHistory?.reduce((acc, cur) => acc + cur.usedPoint, 0) ?? 0;

  return {
    lastMonthEarnedPoints,
    thisMonthExchangePoints,
    currentCompanyPointBalance: company?.companyPointBalance ?? 0,
  };
};
