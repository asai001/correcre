import { toYYYYMM } from "@correcre/lib";
import { listEnabledLatestMissionsByCompany } from "@correcre/lib/dynamodb/mission";
import { listMissionReportsByCompanyAndStatus } from "@correcre/lib/dynamodb/mission-report";
import { listUsersByCompany } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";

import type { DBUserItem } from "@correcre/types";

import type { AvgItemCompletionItem } from "../model/types";

type AnalysisUser = Pick<DBUserItem, "userId" | "status" | "roles" | "joinedAt" | "createdAt">;

function shiftYearMonth(baseYm: string, monthOffset: number): string {
  const [yearStr, monthStr] = baseYm.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const date = new Date(year, month - 1 + monthOffset, 1);

  return toYYYYMM(date);
}

function getDaysInMonth(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function toUtcDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function isAnalysisTargetUser(user: AnalysisUser) {
  return user.status === "ACTIVE" && user.roles.includes("EMPLOYEE");
}

function getUserStartDate(user: Pick<AnalysisUser, "joinedAt" | "createdAt">) {
  const startDate = user.joinedAt?.trim() || user.createdAt?.slice(0, 10) || "";
  return /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? startDate : "";
}

function isUserStartedByDate(user: Pick<AnalysisUser, "joinedAt" | "createdAt">, date: string) {
  const startDate = getUserStartDate(user);
  return !startDate || startDate <= date;
}

function getUserCoveredDaysInMonth(user: Pick<AnalysisUser, "joinedAt" | "createdAt">, yearMonth: string) {
  const monthStart = `${yearMonth}-01`;
  const monthEnd = `${yearMonth}-${String(getDaysInMonth(yearMonth)).padStart(2, "0")}`;
  const startDate = getUserStartDate(user);
  const effectiveStartDate = startDate && startDate > monthStart ? startDate : monthStart;
  const start = toUtcDate(effectiveStartDate);
  const end = toUtcDate(monthEnd);

  if (start > end) {
    return 0;
  }

  return Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
}

export async function getAvgItemCompletionFromDynamo(
  companyId: string,
  thisYearMonth: string,
): Promise<AvgItemCompletionItem[] | null> {
  const region = readRequiredServerEnv("AWS_REGION");
  const [missions, users, missionReports] = await Promise.all([
    listEnabledLatestMissionsByCompany(
      {
        region,
        tableName: readRequiredServerEnv("DDB_MISSION_TABLE_NAME"),
      },
      companyId,
    ),
    listUsersByCompany(
      {
        region,
        tableName: readRequiredServerEnv("DDB_USER_TABLE_NAME"),
      },
      companyId,
    ),
    listMissionReportsByCompanyAndStatus(
      {
        region,
        tableName: readRequiredServerEnv("DDB_MISSION_REPORT_TABLE_NAME"),
      },
      companyId,
      "APPROVED",
    ),
  ]);

  if (!missions.length) {
    return [];
  }

  const targetYearMonth = shiftYearMonth(thisYearMonth, -1);
  const analysisUsers = users.filter(isAnalysisTargetUser);
  const analysisUserById = new Map(analysisUsers.map((user) => [user.userId, user]));
  const daysInTargetMonth = getDaysInMonth(targetYearMonth);
  const userMonthWeight = analysisUsers.reduce(
    (sum, user) => sum + getUserCoveredDaysInMonth(user, targetYearMonth) / daysInTargetMonth,
    0,
  );
  const reportCountByMissionId = new Map<string, number>();

  for (const report of missionReports) {
    if (report.reportedAt.slice(0, 7) !== targetYearMonth) {
      continue;
    }

    const user = analysisUserById.get(report.userId);
    if (!user || !isUserStartedByDate(user, report.reportedAt.slice(0, 10))) {
      continue;
    }

    reportCountByMissionId.set(report.missionId, (reportCountByMissionId.get(report.missionId) ?? 0) + 1);
  }

  return missions.map((mission) => {
    const denominator = mission.monthlyCount * userMonthWeight;
    const numerator = reportCountByMissionId.get(mission.missionId) ?? 0;
    const completionRate = denominator === 0 ? 0 : Math.min(100, Math.round((numerator / denominator) * 100));

    return {
      title: mission.title,
      completionRate,
    };
  });
}
