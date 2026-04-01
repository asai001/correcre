import { listEnabledLatestMissionsByCompany } from "@correcre/lib/dynamodb/mission";
import { listMissionReportsByCompanyAndUser } from "@correcre/lib/dynamodb/mission-report";
import { listUserMonthlyStatsByCompanyAndUser } from "@correcre/lib/dynamodb/user-monthly-stats";
import { readRequiredServerEnv } from "@correcre/lib/env/server";

import type { MissionReport, UserMonthlyStats } from "@correcre/types";

import type {
  AnalysisMissionItem,
  AnalysisRadarItem,
  AnalysisTrendItem,
  IndividualAnalysisSummary,
} from "../model/types";

type RuntimeConfig = {
  region: string;
  missionTableName: string;
  missionReportTableName: string;
  userMonthlyStatsTableName: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function getRuntimeConfig(): RuntimeConfig {
  return {
    region: readRequiredServerEnv("AWS_REGION"),
    missionTableName: readRequiredServerEnv("DDB_MISSION_TABLE_NAME"),
    missionReportTableName: readRequiredServerEnv("DDB_MISSION_REPORT_TABLE_NAME"),
    userMonthlyStatsTableName: readRequiredServerEnv("DDB_USER_MONTHLY_STATS_TABLE_NAME"),
  };
}

function toUtcDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function toYearMonth(dateTime: string) {
  return dateTime.slice(0, 7);
}

function formatYearMonth(yearMonth: string) {
  return yearMonth.replace("-", "/");
}

function listYearMonthsBetween(startDate: string, endDate: string) {
  const [startYear, startMonth] = startDate.split("-").map(Number);
  const [endYear, endMonth] = endDate.split("-").map(Number);

  const months: string[] = [];
  let year = startYear;
  let month = startMonth;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;

    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return months;
}

function getDaysInMonth(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function getCoveredDaysInMonth(yearMonth: string, startDate: string, endDate: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  const monthStart = Date.UTC(year, month - 1, 1);
  const monthEnd = Date.UTC(year, month - 1, getDaysInMonth(yearMonth));
  const rangeStart = toUtcDate(startDate);
  const rangeEnd = toUtcDate(endDate);
  const start = Math.max(monthStart, rangeStart);
  const end = Math.min(monthEnd, rangeEnd);

  if (start > end) {
    return 0;
  }

  return Math.floor((end - start) / DAY_MS) + 1;
}

function isWithinDateRange(dateTime: string, startDate: string, endDate: string) {
  const date = dateTime.slice(0, 10);
  return date >= startDate && date <= endDate;
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function toRate(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return Math.min(100, round((numerator / denominator) * 100, 1));
}

export async function getIndividualAnalysisSummaryFromDynamo(
  companyId: string,
  userId: string,
  startDate: string,
  endDate: string,
): Promise<IndividualAnalysisSummary> {
  const config = getRuntimeConfig();
  const months = listYearMonthsBetween(startDate, endDate);

  const [missions, allReports, allMonthlyStats] = await Promise.all([
    listEnabledLatestMissionsByCompany(
      {
        region: config.region,
        tableName: config.missionTableName,
      },
      companyId,
    ),
    listMissionReportsByCompanyAndUser(
      {
        region: config.region,
        tableName: config.missionReportTableName,
      },
      companyId,
      userId,
    ),
    listUserMonthlyStatsByCompanyAndUser(
      {
        region: config.region,
        tableName: config.userMonthlyStatsTableName,
      },
      companyId,
      userId,
    ),
  ]);

  const monthlyStats = allMonthlyStats.filter((item) => months.includes(item.yearMonth));
  const monthlyStatByYearMonth = new Map<string, UserMonthlyStats>(
    monthlyStats.map((item) => [item.yearMonth, item]),
  );
  const allApprovedReports = allReports.filter((report) => report.status === "APPROVED");
  const approvedReportsInRange = allApprovedReports.filter((report) =>
    isWithinDateRange(report.reportedAt, startDate, endDate),
  );

  const monthlyApprovedReports = new Map<string, MissionReport[]>();
  for (const report of allApprovedReports) {
    const yearMonth = toYearMonth(report.reportedAt);
    const items = monthlyApprovedReports.get(yearMonth) ?? [];
    items.push(report);
    monthlyApprovedReports.set(yearMonth, items);
  }

  const reportCountByMissionId = new Map<string, number>();
  const reportScoreByMissionId = new Map<string, number>();
  for (const report of approvedReportsInRange) {
    reportCountByMissionId.set(report.missionId, (reportCountByMissionId.get(report.missionId) ?? 0) + 1);
    reportScoreByMissionId.set(report.missionId, (reportScoreByMissionId.get(report.missionId) ?? 0) + (report.scoreGranted ?? 0));
  }

  let totalEarnedPoints = 0;
  const trendData: AnalysisTrendItem[] = months.map((yearMonth) => {
    const monthlyStat = monthlyStatByYearMonth.get(yearMonth);
    const reportsInMonth = monthlyApprovedReports.get(yearMonth) ?? [];
    const totalMonthScore = reportsInMonth.reduce((sum, report) => sum + (report.scoreGranted ?? 0), 0);
    const selectedMonthReports = reportsInMonth.filter((report) => isWithinDateRange(report.reportedAt, startDate, endDate));
    const selectedMonthScore = selectedMonthReports.reduce((sum, report) => sum + (report.scoreGranted ?? 0), 0);

    const earnedPointsInRange =
      monthlyStat && totalMonthScore > 0 ? round((monthlyStat.earnedPoints * selectedMonthScore) / totalMonthScore, 0) : 0;

    let targetMonthScore = 0;
    for (const mission of missions) {
      const coveredDays = getCoveredDaysInMonth(yearMonth, startDate, endDate);
      if (coveredDays === 0) {
        continue;
      }

      targetMonthScore += (mission.monthlyCount * mission.score * coveredDays) / getDaysInMonth(yearMonth);
    }

    const score = toRate(selectedMonthScore, targetMonthScore);
    totalEarnedPoints += earnedPointsInRange;

    return {
      month: formatYearMonth(yearMonth),
      score,
    };
  });

  let totalTargetScore = 0;
  let totalActualScore = 0;
  let totalTargetCount = 0;
  let totalActualCount = 0;

  const radarData: AnalysisRadarItem[] = missions.map((mission) => {
    let targetCount = 0;

    for (const yearMonth of months) {
      const coveredDays = getCoveredDaysInMonth(yearMonth, startDate, endDate);
      if (coveredDays === 0) {
        continue;
      }

      targetCount += (mission.monthlyCount * coveredDays) / getDaysInMonth(yearMonth);
    }

    const actualCount = reportCountByMissionId.get(mission.missionId) ?? 0;
    const actualScore = reportScoreByMissionId.get(mission.missionId) ?? 0;
    const targetScore = targetCount * mission.score;

    totalTargetCount += targetCount;
    totalActualCount += actualCount;
    totalTargetScore += targetScore;
    totalActualScore += actualScore;

    return {
      category: mission.title,
      achievement: toRate(actualCount, targetCount),
    };
  });

  const sortedMissions = [...radarData].sort((a, b) => b.achievement - a.achievement || a.category.localeCompare(b.category, "ja"));
  const goodMissions: AnalysisMissionItem[] = sortedMissions.slice(0, 2).map((mission) => ({
    name: mission.category,
    percentage: mission.achievement,
  }));
  const improvementMissions: AnalysisMissionItem[] = [...sortedMissions]
    .reverse()
    .slice(0, 2)
    .map((mission) => ({
      name: mission.category,
      percentage: mission.achievement,
    }));

  const averageScore =
    trendData.length > 0 ? round(trendData.reduce((sum, item) => sum + item.score, 0) / trendData.length, 1) : 0;

  return {
    earnedPoints: totalEarnedPoints,
    achievementScore: toRate(totalActualScore, totalTargetScore),
    achievementRate: toRate(totalActualCount, totalTargetCount),
    averageScore,
    radarData,
    trendData,
    goodMissions,
    improvementMissions,
  };
}
