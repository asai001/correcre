import { listLatestMissionsByCompany } from "@correcre/lib/dynamodb/mission";
import { listMissionReportsByCompany } from "@correcre/lib/dynamodb/mission-report";
import { listUsersByCompany } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { joinNameParts } from "@correcre/lib/user-profile";

import type { Mission, MissionReport } from "@correcre/types";

import type { RecentReport } from "../model/types";

type RuntimeConfig = {
  region: string;
  missionTableName: string;
  missionReportTableName: string;
  userTableName: string;
};

type UserData = {
  companyId: string;
  userId: string;
  name: string;
  department?: string;
  roles: string[];
};

function getRuntimeConfig(): RuntimeConfig {
  return {
    region: readRequiredServerEnv("AWS_REGION"),
    missionTableName: readRequiredServerEnv("DDB_MISSION_TABLE_NAME"),
    missionReportTableName: readRequiredServerEnv("DDB_MISSION_REPORT_TABLE_NAME"),
    userTableName: readRequiredServerEnv("DDB_USER_TABLE_NAME"),
  };
}

function isWithinDateRange(dateTime: string, startDate?: string, endDate?: string) {
  const date = dateTime.slice(0, 10);
  return (!startDate || date >= startDate) && (!endDate || date <= endDate);
}

function toYearMonth(dateTime: string) {
  return dateTime.slice(0, 7);
}

function formatFieldValue(value: unknown) {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return String(value);
}

function getMissionTitle(report: MissionReport, mission?: Mission) {
  return mission?.title || report.missionTitleSnapshot || "-";
}

function getMissionMonthlyCount(mission?: Mission) {
  return mission?.monthlyCount ?? 0;
}

export async function getRecentReportsFromDynamo(
  companyId: string,
  limit?: number,
  userId?: string,
  startDate?: string,
  endDate?: string,
): Promise<RecentReport[]> {
  const config = getRuntimeConfig();
  const [missionReports, users, missions] = await Promise.all([
    listMissionReportsByCompany(
      {
        region: config.region,
        tableName: config.missionReportTableName,
      },
      companyId,
    ),
    listUsersByCompany(
      {
        region: config.region,
        tableName: config.userTableName,
      },
      companyId,
    ),
    listLatestMissionsByCompany(
      {
        region: config.region,
        tableName: config.missionTableName,
      },
      companyId,
    ),
  ]);

  const currentUsers = users
    .filter((item) => item.status !== "DELETED")
    .map((item) => ({
      companyId: item.companyId,
      userId: item.userId,
      name: joinNameParts(item.lastName, item.firstName),
      department: item.departmentName,
      roles: item.roles,
    })) as UserData[];

  const sortedReports = missionReports
    .filter(
      (report) =>
        (!userId || report.userId === userId) &&
        isWithinDateRange(report.reportedAt, startDate, endDate),
    )
    .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());

  const filteredReports = typeof limit === "number" ? sortedReports.slice(0, limit) : sortedReports;

  const progressByReportId = new Map<string, number>();
  const approvedReportsInRange = missionReports
    .filter(
      (report) =>
        (!userId || report.userId === userId) &&
        report.status === "APPROVED" &&
        isWithinDateRange(report.reportedAt, startDate, endDate),
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
    const user = currentUsers.find((item) => item.companyId === report.companyId && item.userId === report.userId);
    const mission = missions.find((item) => item.companyId === report.companyId && item.missionId === report.missionId);
    const fieldValues = report.fieldValues;

    let inputContent = "";
    if (fieldValues && mission?.fields?.length) {
      inputContent = mission.fields
        .map((field) => {
          const value = fieldValues[field.id];
          if (value === undefined || value === null || value === "") {
            return null;
          }

          return `${field.label}: ${formatFieldValue(value)}`;
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
      itemName: getMissionTitle(report, mission),
      progress: `${progressCount}/${getMissionMonthlyCount(mission)}`,
      inputContent,
    };
  });
}
