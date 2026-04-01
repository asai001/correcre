import { toYYYYMM } from "@correcre/lib";
import { getCompanyById } from "@correcre/lib/dynamodb/company";
import { listEnabledLatestMissionsByCompany } from "@correcre/lib/dynamodb/mission";
import { listMissionReportsByCompanyAndStatus } from "@correcre/lib/dynamodb/mission-report";
import { readRequiredServerEnv } from "@correcre/lib/env/server";

import type { AvgItemCompletionItem } from "../model/types";

function shiftYearMonth(baseYm: string, monthOffset: number): string {
  const [yearStr, monthStr] = baseYm.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const date = new Date(year, month - 1 + monthOffset, 1);

  return toYYYYMM(date);
}

export async function getAvgItemCompletionFromDynamo(
  companyId: string,
  thisYearMonth: string,
): Promise<AvgItemCompletionItem[] | null> {
  const region = readRequiredServerEnv("AWS_REGION");
  const [missions, company, missionReports] = await Promise.all([
    listEnabledLatestMissionsByCompany(
      {
        region,
        tableName: readRequiredServerEnv("DDB_MISSION_TABLE_NAME"),
      },
      companyId,
    ),
    getCompanyById(
      {
        region,
        tableName: readRequiredServerEnv("DDB_COMPANY_TABLE_NAME"),
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

  const activeEmployees = company?.activeEmployees ?? 0;
  const targetYearMonth = shiftYearMonth(thisYearMonth, -1);
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
