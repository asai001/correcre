import { listLatestMissionsByCompany } from "@correcre/lib/dynamodb/mission";
import { listMissionHistory } from "@correcre/lib/dynamodb/mission-history";
import { listMissionReportsByCompany } from "@correcre/lib/dynamodb/mission-report";
import { listUsersByCompany } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { joinNameParts } from "@correcre/lib/user-profile";

import type { Mission, MissionField, MissionHistory, MissionImageFieldValue, MissionReport } from "@correcre/types";

import type { RecentReport, RecentReportImageRef } from "../model/types";

function isImageFieldValue(value: unknown): value is MissionImageFieldValue {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as MissionImageFieldValue).s3Key === "string"
  );
}

type RuntimeConfig = {
  region: string;
  missionTableName: string;
  missionReportTableName: string;
  userTableName: string;
  // 報告時点のミッション定義を復元するために使う。未設定なら履歴引きをスキップし
  // 現行ミッション定義にフォールバックする（項目名は報告時スナップショットを優先）。
  missionHistoryTableName?: string;
};

function readOptionalServerEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

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
    missionHistoryTableName: readOptionalServerEnv("DDB_MISSION_HISTORY_TABLE_NAME"),
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

// 報告時点の項目名を優先して返す。ミッションは後から改名され得るため、
// 現行ミッション名 (mission.title) ではなく報告時のスナップショットを使う。
function getMissionTitle(report: MissionReport, snapshotTitle?: string, mission?: Mission) {
  return report.missionTitleSnapshot || snapshotTitle || mission?.title || "-";
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

  const currentUsers: UserData[] = users
    .filter((item) => item.status !== "DELETED")
    .map((item) => ({
      companyId: item.companyId,
      userId: item.userId,
      name: joinNameParts(item.lastName, item.firstName),
      department: item.departmentName,
      roles: item.roles,
    })) as UserData[];

  const sortedReports: MissionReport[] = missionReports
    .filter(
      (report: MissionReport) =>
        (!userId || report.userId === userId) &&
        isWithinDateRange(report.reportedAt, startDate, endDate),
    )
    .sort((a: MissionReport, b: MissionReport) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());

  const filteredReports = typeof limit === "number" ? sortedReports.slice(0, limit) : sortedReports;

  // 報告時点のミッション定義（項目名・フィールドラベル・型）を復元する。
  // MissionReport は fields のスナップショットを持たず missionVersion のみ保持するため、
  // 表示対象レポートが参照するミッションの履歴を version 単位で引く。
  // 履歴テーブル未設定/取得失敗時は現行ミッション定義にフォールバックする（画面を落とさない）。
  const historyByVersionKey = new Map<string, MissionHistory>();
  if (config.missionHistoryTableName) {
    const missionHistoryTableName = config.missionHistoryTableName;
    const missionIdsNeedingHistory = Array.from(
      new Set(
        filteredReports
          .filter((report: MissionReport) => typeof report.missionVersion === "number")
          .map((report: MissionReport) => report.missionId),
      ),
    );

    const histories = await Promise.all(
      missionIdsNeedingHistory.map((missionId) =>
        listMissionHistory({ region: config.region, tableName: missionHistoryTableName }, companyId, missionId).catch(
          (error) => {
            console.error(`failed to load mission history: missionId=${missionId}`, error);
            return [] as MissionHistory[];
          },
        ),
      ),
    );

    for (const history of histories.flat()) {
      historyByVersionKey.set(`${history.missionId}#${history.version}`, history);
    }
  }

  const progressByReportId = new Map<string, number>();
  const approvedReportsInRange: MissionReport[] = missionReports
    .filter(
      (report: MissionReport) =>
        (!userId || report.userId === userId) &&
        report.status === "APPROVED" &&
        isWithinDateRange(report.reportedAt, startDate, endDate),
    )
    .sort((a: MissionReport, b: MissionReport) => {
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

  return filteredReports.map((report: MissionReport) => {
    const user = currentUsers.find((item: UserData) => item.companyId === report.companyId && item.userId === report.userId);
    const mission = missions.find((item: Mission) => item.companyId === report.companyId && item.missionId === report.missionId);
    const fieldValues = report.fieldValues;

    // 報告時点の版を優先し、無ければ現行ミッション定義にフォールバックする。
    const snapshot =
      typeof report.missionVersion === "number"
        ? historyByVersionKey.get(`${report.missionId}#${report.missionVersion}`)
        : undefined;
    const fields = (snapshot?.fields ?? mission?.fields) as MissionField[] | undefined;

    let inputContent = "";
    const images: RecentReportImageRef[] = [];

    if (fieldValues && fields?.length) {
      const lines: string[] = [];
      for (const field of fields) {
        const value = fieldValues[field.key];
        if (value === undefined || value === null || value === "") {
          continue;
        }

        // 宣言された型ではなく値の実体で画像判定する。ミッションが後から編集され
        // 型が変わっていても、画像を [object Object] と表示しないようにするため。
        if (isImageFieldValue(value)) {
          images.push({
            fieldKey: field.key,
            label: field.label,
            s3Key: value.s3Key,
            originalFileName: value.originalFileName,
            contentType: value.contentType,
          });
          lines.push(`${field.label}: <image:${field.key}>`);
          continue;
        }

        lines.push(`${field.label}: ${formatFieldValue(value)}`);
      }
      inputContent = lines.join("\n");
    } else if (report.comment) {
      inputContent = report.comment;
    }

    const progressCount = progressByReportId.get(report.reportId) ?? 0;

    return {
      date: report.reportedAt,
      name: user?.name || "-",
      itemName: getMissionTitle(report, snapshot?.title, mission),
      progress: `${progressCount}/${getMissionMonthlyCount(mission)}`,
      inputContent,
      images: images.length > 0 ? images : undefined,
    };
  });
}
