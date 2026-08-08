import { nowYYYYMM, reflectMission, toYYYYMM } from "@correcre/lib";
import { listLatestMissionsByCompany } from "@correcre/lib/dynamodb/mission";
import { listMissionReportsByCompanyAndUser } from "@correcre/lib/dynamodb/mission-report";
import { readRequiredServerEnv } from "@correcre/lib/env/server";

import type { Mission as DBMission, MissionField } from "@correcre/types";

import type { FieldConfig, Mission, MissionReport } from "../model/types";

function mapMissionFieldType(type: MissionField["type"]): FieldConfig["type"] {
  if (type === "datetime") return "datetime-local";
  return type as FieldConfig["type"];
}

function toFieldConfig(field: MissionField): FieldConfig {
  return {
    id: field.key,
    label: field.label,
    type: mapMissionFieldType(field.type),
    placeholder: field.placeholder,
    helpText: field.helpText,
    required: field.required,
    rows: field.type === "textarea" ? 4 : undefined,
    minLength: field.minLength,
    maxLength: field.maxLength,
    min: field.min,
    max: field.max,
    minSelected: field.minSelected,
    maxSelected: field.maxSelected,
    options: field.options?.map((option) => ({
      label: option,
      value: option,
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
    order: mission.slotIndex,
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

  const [rawMissions, missionReports] = await Promise.all([
    listLatestMissionsByCompany(
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

  // 「翌月月初から反映」予約が反映予定月に達していれば、表示上は反映後の内容にする（非永続）。
  // enabled も予約で変わり得るため、反映後に enabled を判定してから絞り込む。
  const missions = rawMissions
    .map((mission) => reflectMission(mission).mission)
    .filter((mission) => mission.enabled);

  return {
    mission: missions.map(toMission),
    missionReports: missionReports
      .filter((item) => item.status === "APPROVED" && toYYYYMM(new Date(item.reportedAt)) === thisYearMonth)
      .map(toMissionReport),
  };
}
