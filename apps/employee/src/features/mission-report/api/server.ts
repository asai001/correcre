import { nowYYYYMM, toYYYYMM } from "@correcre/lib";
import { listEnabledLatestMissionsByCompany } from "@correcre/lib/dynamodb/mission";
import { listMissionReportsByCompanyAndUser } from "@correcre/lib/dynamodb/mission-report";
import { readRequiredServerEnv } from "@correcre/lib/env/server";

import type { Mission as DBMission, MissionField } from "@correcre/types";

import type { FieldConfig, Mission, MissionReport } from "../model/types";

function toFieldConfig(field: MissionField): FieldConfig {
  return {
    id: field.id,
    label: field.label,
    type: field.type,
    placeholder: field.placeholder,
    required: field.required,
    rows: field.rows,
    selectValueType: field.selectValueType,
    options: field.options?.map((option) => ({
      label: option.label,
      value: String(option.value),
    })),
  };
}

function toMission(mission: DBMission): Mission {
  return {
    companyId: mission.companyId,
    missionId: mission.missionId,
    version: mission.version,
    enabled: mission.enabled,
    title: mission.title,
    description: mission.description,
    category: mission.category,
    monthlyCount: mission.monthlyCount,
    score: mission.score,
    order: mission.order,
    fields: mission.fields.map(toFieldConfig),
  };
}

function toMissionReport(report: {
  companyId: string;
  userId: string;
  reportId: string;
  missionId: string;
  reportedAt: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
  pointGranted?: number;
  comment?: string;
}): MissionReport {
  return {
    companyId: report.companyId,
    userId: report.userId,
    reportId: report.reportId,
    missionId: report.missionId,
    reportedAt: report.reportedAt,
    status: report.status === "APPROVED" ? "APPROVED" : "PENDING",
    pointGranted: report.pointGranted ?? 0,
    comment: report.comment ?? "",
  };
}

export async function getMissionFromDynamo(
  companyId: string,
  userId: string,
): Promise<{ mission: Mission[]; missionReports: MissionReport[] }> {
  const region = readRequiredServerEnv("AWS_REGION");
  const missionTableName = readRequiredServerEnv("DDB_MISSION_TABLE_NAME");
  const missionReportTableName = readRequiredServerEnv("DDB_MISSION_REPORT_TABLE_NAME");
  const thisYearMonth = nowYYYYMM();

  const [missions, missionReports] = await Promise.all([
    listEnabledLatestMissionsByCompany(
      {
        region,
        tableName: missionTableName,
      },
      companyId,
    ),
    listMissionReportsByCompanyAndUser(
      {
        region,
        tableName: missionReportTableName,
      },
      companyId,
      userId,
    ),
  ]);

  return {
    mission: missions.map(toMission),
    missionReports: missionReports
      .filter((item) => item.status === "APPROVED" && toYYYYMM(new Date(item.reportedAt)) === thisYearMonth)
      .map(toMissionReport),
  };
}
