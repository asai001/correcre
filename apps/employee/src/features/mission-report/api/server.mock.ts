import { Mission, MissionReport } from "../model/types";
import data from "../../../../../mock/dynamodb.json";
import { nowYYYYMM, toYYYYMM } from "@correcre/lib";

/**
 * ユーザーの任意の月のミッション報告レポートを取得
 * @param companyId
 * @returns
 */
async function getMission(companyId: string): Promise<Mission[]> {
  const Items = data.Mission;
  return Items.filter((i) => i.companyId === companyId) as Mission[];
}

/**
 * 当月のミッション報告
 *
 * @param companyId
 * @param userId
 * @returns
 */
async function getMissionReportsThisMonth(companyId: string, userId: string): Promise<MissionReport[]> {
  const Items = data.MissionReports;
  const thisYearMonth = nowYYYYMM();
  return Items.filter(
    (i) => i.companyId === companyId && i.userId === userId && i.status === "APPROVED" && toYYYYMM(new Date(i.reportedAt)) === thisYearMonth
  ) as MissionReport[];
}

/**
 * 対象ユーザーのダッシュボードサマリーを返す
 *
 * @param companyId
 * @returns
 */
export const getMissionFromDynamoMock = async (
  companyId: string,
  userId: string
): Promise<{ mission: Mission[]; missionReports: MissionReport[] }> => {
  const mission = await getMission(companyId);
  const missionReports = await getMissionReportsThisMonth(companyId, userId);

  return { mission, missionReports };
};
