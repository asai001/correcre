import { toYYYYMM } from "@correcre/lib";
import { listEnabledLatestMissionsByCompany } from "@correcre/lib/dynamodb/mission";
import { listMissionReportsByCompanyAndStatus } from "@correcre/lib/dynamodb/mission-report";
import { listUsersByCompany } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";

import type { AvgItemCompletionItem } from "../model/types";

function shiftYearMonth(baseYm: string, monthOffset: number): string {
  const [yearStr, monthStr] = baseYm.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const date = new Date(year, month - 1 + monthOffset, 1);

  return toYYYYMM(date);
}

function getUserJoinedYearMonth(user: { joinedAt?: string; createdAt?: string }) {
  const joinedDate = user.joinedAt?.trim() || user.createdAt?.slice(0, 10) || "";
  return /^\d{4}-\d{2}/.test(joinedDate) ? joinedDate.slice(0, 7) : "";
}

function isUserJoinedByMonth(user: { joinedAt?: string; createdAt?: string }, yearMonth: string) {
  const joinedYearMonth = getUserJoinedYearMonth(user);
  return !joinedYearMonth || joinedYearMonth <= yearMonth;
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
  const activeEmployees = users.filter(
    (user) => user.status === "ACTIVE" && isUserJoinedByMonth(user, targetYearMonth),
  ).length;
  const reportCountByMissionId = new Map<string, number>();

  for (const report of missionReports) {
    if (report.reportedAt.slice(0, 7) !== targetYearMonth) {
      continue;
    }

    reportCountByMissionId.set(report.missionId, (reportCountByMissionId.get(report.missionId) ?? 0) + 1);
  }

  return missions.map((mission) => {
    const denominator = mission.monthlyCount * activeEmployees;
    const numerator = reportCountByMissionId.get(mission.missionId) ?? 0;
    const completionRate = denominator === 0 ? 0 : Math.min(100, Math.round((numerator / denominator) * 100));

    return {
      title: mission.title,
      completionRate,
    };
  });
}
