import data from "../../../../../../apps/mock/dynamodb.json";
import { Mission, MissionReport } from "@correcre/types";
import type { RecentReport } from "../model/types";

type UserData = {
  companyId: string;
  userId: string;
  name: string;
  department?: string;
  roles: string[];
};

function isWithinDateRange(dateTime: string, startDate?: string, endDate?: string) {
  const date = dateTime.slice(0, 10);
  return (!startDate || date >= startDate) && (!endDate || date <= endDate);
}

function toYearMonth(dateTime: string) {
  return dateTime.slice(0, 7);
}

function hashString(value: string) {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  return hash;
}

function formatDate(dateTime: string) {
  return dateTime.slice(0, 10);
}

function formatDateTime(dateTime: string) {
  return dateTime.slice(0, 19).replace("T", " ");
}

function buildFallbackFieldValues(report: MissionReport): Record<string, string> | undefined {
  switch (report.missionId) {
    case "greetings": {
      const samples = [
        "始業前・昼・退勤時に実施（計3回）",
        "朝会前に受付と執務室で声掛け",
        "他部署へ資料受け渡しの際に挨拶",
        "終業前の巡回時に一言添えて実施",
      ];
      const note = samples[hashString(report.reportId) % samples.length];

      return {
        note,
        date: formatDate(report.reportedAt),
      };
    }
    case "health": {
      const samples = [
        "ウォーキング平均 8,200 歩/日（雨天はストレッチ）",
        "昼休みに階段利用と15分の散歩",
        "就寝前にストレッチ10分、肩まわり中心",
        "通勤を一駅分歩きに変更、週4日実施",
      ];

      return {
        activity_detail: samples[hashString(report.reportId) % samples.length],
      };
    }
    case "growth": {
      const samples = [
        {
          reference_title: "『リーダブルコード』",
          learning_content: "関数命名・早期return・コメント指針",
          application_plan: "PRテンプレにチェック項目を追加",
        },
        {
          reference_title: "社内勉強会資料「SQLチューニング基礎」",
          learning_content: "インデックス設計と実行計画の見方",
          application_plan: "月次集計クエリの見直しに反映",
        },
        {
          reference_title: "Udemy講座「Next.js実践入門」",
          learning_content: "Server Actions とフォーム設計",
          application_plan: "申請画面のバリデーション改善に活用",
        },
        {
          reference_title: "技術ブログ「レビューしやすいPRの作り方」",
          learning_content: "変更粒度の分割と説明文の書き方",
          application_plan: "今後のPR説明テンプレを統一",
        },
      ];

      return samples[hashString(report.reportId) % samples.length];
    }
    case "improve": {
      const samples = [
        {
          proposal_detail: "勤怠集計の自動化（GAS）",
          expected_effect: "集計工数 月30分→5分、入力ミス削減",
        },
        {
          proposal_detail: "問い合わせ一次回答テンプレートの整備",
          expected_effect: "返信時間を短縮し、回答品質を平準化",
        },
        {
          proposal_detail: "週報フォームの入力項目見直し",
          expected_effect: "重複入力をなくし、記入時間を約10分短縮",
        },
        {
          proposal_detail: "請求書チェックリストの共通化",
          expected_effect: "確認漏れ防止と引き継ぎしやすさ向上",
        },
      ];

      return samples[hashString(report.reportId) % samples.length];
    }
    case "community": {
      const samples = [
        "駅前〜公園の清掃",
        "会社周辺の歩道清掃と落ち葉回収",
        "地域イベントの受付補助",
        "近隣公園の花壇整備とごみ拾い",
      ];

      return {
        activity_detail: samples[hashString(report.reportId) % samples.length],
        performed_at: formatDateTime(report.reportedAt),
      };
    }
    default:
      return undefined;
  }
}

export async function getRecentReportsFromDynamoMock(
  companyId: string,
  limit?: number,
  userId?: string,
  startDate?: string,
  endDate?: string
): Promise<RecentReport[]> {
  const missionReports = data.MissionReports as MissionReport[];
  const users = data.User as UserData[];
  const missions = data.Mission as Mission[];

  if (!missionReports || !users || !missions) {
    throw new Error("Data not found");
  }

  const sortedReports = missionReports
    .filter(
      (report) =>
        report.companyId === companyId &&
        (!userId || report.userId === userId) &&
        isWithinDateRange(report.reportedAt, startDate, endDate)
    )
    .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());

  const filteredReports = typeof limit === "number" ? sortedReports.slice(0, limit) : sortedReports;

  const progressByReportId = new Map<string, number>();
  const approvedReportsInRange = missionReports
    .filter(
      (report) =>
        report.companyId === companyId &&
        (!userId || report.userId === userId) &&
        report.status === "APPROVED" &&
        isWithinDateRange(report.reportedAt, startDate, endDate)
    )
    .sort((a, b) => {
      const timeDiff = new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime();

      if (timeDiff !== 0) {
        return timeDiff;
      }

      return a.reportId.localeCompare(b.reportId);
    });

  const progressCounters = new Map<string, number>();
  for (const report of approvedReportsInRange) {
    const progressKey = `${report.companyId}:${report.userId}:${report.missionId}:${toYearMonth(report.reportedAt)}`;
    const nextCount = (progressCounters.get(progressKey) ?? 0) + 1;

    progressCounters.set(progressKey, nextCount);
    progressByReportId.set(report.reportId, nextCount);
  }

  return filteredReports.map((report) => {
    const user = users.find((item) => item.companyId === report.companyId && item.userId === report.userId);
    const mission = missions.find((item) => item.companyId === report.companyId && item.missionId === report.missionId);
    const fieldValues = report.fieldValues ?? buildFallbackFieldValues(report);

    let inputContent = "";
    if (fieldValues && mission?.fields) {
      inputContent = mission.fields
        .map((field) => {
          const value = fieldValues[field.id];
          if (value === undefined || value === null || value === "") {
            return null;
          }

          return `${field.label}: ${value}`;
        })
        .filter(Boolean)
        .join("\n");
    } else if (report.comment) {
      inputContent = report.comment;
    }

    const progressCount = progressByReportId.get(report.reportId) ?? 0;

    return {
      date: report.reportedAt,
      name: user?.name || "-",
      itemName: mission?.title || "-",
      progress: `${progressCount}/${mission?.monthlyCount || 0}`,
      inputContent,
    };
  });
}
