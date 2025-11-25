import data from "../../../../../mock/dynamodb.json";
import { MissionReport, Mission } from "@correcre/types";
import type { RecentReport } from "../model/types";

// dynamodb.jsonのUserデータの型
type UserData = {
  companyId: string;
  userId: string;
  name: string;
  department?: string;
  roles: string[];
};

/**
 * 企業の「直近の報告内容」を取得
 */
export async function getRecentReportsFromDynamoMock(companyId: string, limit: number = 5): Promise<RecentReport[]> {
  const missionReports = data.MissionReports as MissionReport[];
  const users = data.User as UserData[];
  const missions = data.Mission as Mission[];

  if (!missionReports || !users || !missions) {
    throw new Error("Data not found");
  }

  // companyIdでフィルタリングし、reportedAtで降順ソート（新しい順）
  const filteredReports = missionReports
    .filter((r) => r.companyId === companyId)
    .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())
    .slice(0, limit);

  // ユーザー名とミッション名を結合
  const result: RecentReport[] = filteredReports.map((report) => {
    const user = users.find((u) => u.companyId === report.companyId && u.userId === report.userId);
    const mission = missions.find((m) => m.companyId === report.companyId && m.missionId === report.missionId);

    return {
      date: report.reportedAt,
      name: user?.name || "不明",
      itemName: mission?.title || "不明",
      progress: `${report.scoreGranted || 0}/${mission?.monthlyCount || 0}`,
      inputContent: report.comment || "",
    };
  });

  return result;
}
