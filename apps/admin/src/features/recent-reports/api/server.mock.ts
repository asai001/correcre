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

    let inputContent = "";
    if (report.fieldValues && mission?.fields) {
      inputContent = mission.fields
        .map((field) => {
          const value = report.fieldValues?.[field.id];
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
