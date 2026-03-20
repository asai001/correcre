import data from "../../../../../mock/dynamodb.json";
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
        "\u59cb\u696d\u524d\u30fb\u663c\u30fb\u9000\u52e4\u6642\u306b\u5b9f\u65bd\uff08\u8a083\u56de\uff09",
        "\u671d\u4f1a\u524d\u306b\u53d7\u4ed8\u3068\u57f7\u52d9\u5ba4\u3067\u58f0\u639b\u3051",
        "\u4ed6\u90e8\u7f72\u3078\u8cc7\u6599\u53d7\u3051\u6e21\u3057\u306e\u969b\u306b\u6328\u62f6",
        "\u7d42\u696d\u524d\u306e\u5de1\u56de\u6642\u306b\u4e00\u8a00\u6dfb\u3048\u3066\u5b9f\u65bd",
      ];
      const note = samples[hashString(report.reportId) % samples.length];

      return {
        note,
        date: formatDate(report.reportedAt),
      };
    }
    case "health": {
      const samples = [
        "\u30a6\u30a9\u30fc\u30ad\u30f3\u30b0\u5e73\u5747 8,200 \u6b69/\u65e5\uff08\u96e8\u5929\u306f\u30b9\u30c8\u30ec\u30c3\u30c1\uff09",
        "\u663c\u4f11\u307f\u306b\u968e\u6bb5\u5229\u7528\u306815\u5206\u306e\u6563\u6b69",
        "\u5c31\u5bdd\u524d\u306b\u30b9\u30c8\u30ec\u30c3\u30c110\u5206\u3001\u80a9\u307e\u308f\u308a\u4e2d\u5fc3",
        "\u901a\u52e4\u3092\u4e00\u99c5\u5206\u6b69\u304d\u306b\u5909\u66f4\u3001\u90314\u65e5\u5b9f\u65bd",
      ];

      return {
        activity_detail: samples[hashString(report.reportId) % samples.length],
      };
    }
    case "growth": {
      const samples = [
        {
          reference_title: "\u300e\u30ea\u30fc\u30c0\u30d6\u30eb\u30b3\u30fc\u30c9\u300f",
          learning_content: "\u95a2\u6570\u547d\u540d\u30fb\u65e9\u671freturn\u30fb\u30b3\u30e1\u30f3\u30c8\u6307\u91dd",
          application_plan: "PR\u30c6\u30f3\u30d7\u30ec\u306b\u30c1\u30a7\u30c3\u30af\u9805\u76ee\u3092\u8ffd\u52a0",
        },
        {
          reference_title: "\u793e\u5185\u52c9\u5f37\u4f1a\u8cc7\u6599\u300cSQL\u30c1\u30e5\u30fc\u30cb\u30f3\u30b0\u57fa\u790e\u300d",
          learning_content: "\u30a4\u30f3\u30c7\u30c3\u30af\u30b9\u8a2d\u8a08\u3068\u5b9f\u884c\u8a08\u753b\u306e\u898b\u65b9",
          application_plan: "\u6708\u6b21\u96c6\u8a08\u30af\u30a8\u30ea\u306e\u898b\u76f4\u3057\u306b\u53cd\u6620",
        },
        {
          reference_title: "Udemy\u8b1b\u5ea7\u300cNext.js\u5b9f\u8df5\u5165\u9580\u300d",
          learning_content: "Server Actions \u3068\u30d5\u30a9\u30fc\u30e0\u8a2d\u8a08",
          application_plan: "\u7533\u8acb\u753b\u9762\u306e\u30d0\u30ea\u30c7\u30fc\u30b7\u30e7\u30f3\u6539\u5584\u306b\u6d3b\u7528",
        },
        {
          reference_title: "\u6280\u8853\u30d6\u30ed\u30b0\u300c\u30ec\u30d3\u30e5\u30fc\u3057\u3084\u3059\u3044PR\u306e\u4f5c\u308a\u65b9\u300d",
          learning_content: "\u5909\u66f4\u7c92\u5ea6\u306e\u5206\u5272\u3068\u8aac\u660e\u6587\u306e\u66f8\u304d\u65b9",
          application_plan: "\u4eca\u5f8c\u306ePR\u8aac\u660e\u30c6\u30f3\u30d7\u30ec\u3092\u7d71\u4e00",
        },
      ];

      return samples[hashString(report.reportId) % samples.length];
    }
    case "improve": {
      const samples = [
        {
          proposal_detail: "\u52e4\u6020\u96c6\u8a08\u306e\u81ea\u52d5\u5316\uff08GAS\uff09",
          expected_effect: "\u96c6\u8a08\u5de5\u6570 \u670830\u5206\u21925\u5206\u3001\u5165\u529b\u30df\u30b9\u524a\u6e1b",
        },
        {
          proposal_detail: "\u554f\u3044\u5408\u308f\u305b\u4e00\u6b21\u56de\u7b54\u30c6\u30f3\u30d7\u30ec\u30fc\u30c8\u306e\u6574\u5099",
          expected_effect: "\u8fd4\u4fe1\u6642\u9593\u3092\u77ed\u7e2e\u3057\u3001\u56de\u7b54\u54c1\u8cea\u3092\u5e73\u6e96\u5316",
        },
        {
          proposal_detail: "\u9031\u5831\u30d5\u30a9\u30fc\u30e0\u306e\u5165\u529b\u9805\u76ee\u898b\u76f4\u3057",
          expected_effect: "\u91cd\u8907\u5165\u529b\u3092\u306a\u304f\u3057\u3001\u8a18\u5165\u6642\u9593\u3092\u7d0410\u5206\u77ed\u7e2e",
        },
        {
          proposal_detail: "\u8acb\u6c42\u66f8\u30c1\u30a7\u30c3\u30af\u30ea\u30b9\u30c8\u306e\u5171\u901a\u5316",
          expected_effect: "\u78ba\u8a8d\u6f0f\u308c\u9632\u6b62\u3068\u5f15\u304d\u7d99\u304e\u3057\u3084\u3059\u3055\u5411\u4e0a",
        },
      ];

      return samples[hashString(report.reportId) % samples.length];
    }
    case "community": {
      const samples = [
        "\u99c5\u524d\u301c\u516c\u5712\u306e\u6e05\u6383",
        "\u4f1a\u793e\u5468\u8fba\u306e\u6b69\u9053\u6e05\u6383\u3068\u843d\u3061\u8449\u56de\u53ce",
        "\u5730\u57df\u30a4\u30d9\u30f3\u30c8\u306e\u53d7\u4ed8\u88dc\u52a9",
        "\u8fd1\u96a3\u516c\u5712\u306e\u82b1\u58c7\u6574\u5099\u3068\u3054\u307f\u62fe\u3044",
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
