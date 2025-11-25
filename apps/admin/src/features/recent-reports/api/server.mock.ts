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

    // fieldValuesを整形して表示用の文字列に変換
    let inputContent = "";
    if (report.fieldValues && mission?.fields) {
      // 【修正意図】
      // Object.values()を使うと、キーの順序が保証されず、ラベルなしで値だけが表示されてしまう問題があった。
      // Missionのfields定義に基づいて、正しい順序でラベル付きの形式で表示するように改善。
      // これにより、「参考資料名：〜」「学習内容：〜」のように、各フィールドが何を示すのか明確になる。
      inputContent = mission.fields
        .map((field) => {
          const value = report.fieldValues?.[field.id];
          // 値が存在しない場合はスキップ
          if (value === undefined || value === null || value === "") {
            return null;
          }
          // ラベル付きで表示（例: "参考資料名: リーダブルコード"）
          return `${field.label}: ${value}`;
        })
        .filter(Boolean) // null/undefinedを除外
        .join("\n");
    } else if (report.comment) {
      // 後方互換性: fieldValuesがない場合はcommentを使用
      // @TODO 本番実装時は不要な考慮
      inputContent = report.comment;
    }

    return {
      date: report.reportedAt,
      name: user?.name || "不明",
      itemName: mission?.title || "不明",
      progress: `${report.scoreGranted || 0}/${mission?.monthlyCount || 0}`,
      inputContent,
    };
  });

  return result;
}
