import { getCompanyById } from "@correcre/lib/dynamodb/company";
import { listDepartmentsByCompany } from "@correcre/lib/dynamodb/department";
import { listExchangeHistoryByCompany } from "@correcre/lib/dynamodb/exchange-history";
import { listEnabledLatestMissionsByCompany } from "@correcre/lib/dynamodb/mission";
import { listMissionReportsByCompanyAndStatus } from "@correcre/lib/dynamodb/mission-report";
import { listUserMonthlyStatsByCompany } from "@correcre/lib/dynamodb/user-monthly-stats";
import { listUsersByCompany } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { joinNameParts } from "@correcre/lib/user-profile";

import type { DBUserItem, UserMonthlyStats } from "@correcre/types";

import type {
  OverallAnalysisAchievementItem,
  OverallAnalysisMissionItem,
  OverallAnalysisSummary,
  OverallAnalysisTrendItem,
  OverallExchangeHistoryItem,
} from "../model/types";
import { UNASSIGNED_DEPARTMENT_FILTER } from "../model/constants";

type DateRange = {
  startDate: string;
  endDate: string;
};

type AnalysisUser = Pick<DBUserItem, "userId" | "status" | "roles" | "joinedAt" | "createdAt" | "departmentId">;

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtcDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function formatYearMonth(yearMonth: string) {
  return yearMonth.replace("-", "/");
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
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

function isAnalysisTargetUser(user: AnalysisUser) {
  return user.status === "ACTIVE" && user.roles.includes("EMPLOYEE");
}

function getUserStartDate(user: Pick<AnalysisUser, "joinedAt" | "createdAt">) {
  const startDate = user.joinedAt?.trim() || user.createdAt?.slice(0, 10) || "";
  return /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? startDate : "";
}

function getUserStartYearMonth(user: Pick<AnalysisUser, "joinedAt" | "createdAt">) {
  const startDate = getUserStartDate(user);
  return startDate ? startDate.slice(0, 7) : "";
}

function isUserStartedByMonth(user: Pick<AnalysisUser, "joinedAt" | "createdAt">, yearMonth: string) {
  const startYearMonth = getUserStartYearMonth(user);
  return !startYearMonth || startYearMonth <= yearMonth;
}

function isUserStartedByDate(user: Pick<AnalysisUser, "joinedAt" | "createdAt">, date: string) {
  const startDate = getUserStartDate(user);
  return !startDate || startDate <= date;
}

function getUserCoveredDaysInMonth(
  user: Pick<AnalysisUser, "joinedAt" | "createdAt">,
  yearMonth: string,
  startDate: string,
  endDate: string,
) {
  const userStartDate = getUserStartDate(user);
  const effectiveStartDate = userStartDate && userStartDate > startDate ? userStartDate : startDate;
  return getCoveredDaysInMonth(yearMonth, effectiveStartDate, endDate);
}

function buildUserMonthKey(userId: string, yearMonth: string) {
  return `${userId}:${yearMonth}`;
}

function getMonthlyStatsDateRange(items: UserMonthlyStats[]): DateRange | null {
  if (items.length === 0) {
    return null;
  }

  const yearMonths = items.map((item) => item.yearMonth).sort();
  const startYearMonth = yearMonths[0];
  const endYearMonth = yearMonths[yearMonths.length - 1];

  if (!startYearMonth || !endYearMonth) {
    return null;
  }

  return {
    startDate: `${startYearMonth}-01`,
    endDate: `${endYearMonth}-${String(getDaysInMonth(endYearMonth)).padStart(2, "0")}`,
  };
}

function getDateRangeFromDateTimes(dateTimes: string[]): DateRange | null {
  if (dateTimes.length === 0) {
    return null;
  }

  const sorted = dateTimes.map((value) => value.slice(0, 10)).sort();
  const startDate = sorted[0];
  const endDate = sorted[sorted.length - 1];

  if (!startDate || !endDate) {
    return null;
  }

  return { startDate, endDate };
}

function mergeDateRanges(ranges: Array<DateRange | null>) {
  const validRanges = ranges.filter((range): range is DateRange => Boolean(range));

  if (validRanges.length === 0) {
    return null;
  }

  return {
    startDate: validRanges.reduce((min, current) => (current.startDate < min ? current.startDate : min), validRanges[0].startDate),
    endDate: validRanges.reduce((max, current) => (current.endDate > max ? current.endDate : max), validRanges[0].endDate),
  };
}

function clampDateRange(range: DateRange, availableRange: DateRange | null): DateRange | null {
  if (!availableRange) {
    return null;
  }

  const startDate = range.startDate > availableRange.startDate ? range.startDate : availableRange.startDate;
  const endDate = range.endDate < availableRange.endDate ? range.endDate : availableRange.endDate;

  if (startDate > endDate) {
    return null;
  }

  return { startDate, endDate };
}

function buildEmptySummary(): OverallAnalysisSummary {
  return {
    averageScore: 0,
    totalEarnedPoints: 0,
    totalUsedPoints: 0,
    trendData: [],
    achievementData: [],
    goodMissions: [],
    improvementMissions: [],
    exchangeHistory: [],
  };
}

function isUserWithoutAssignedDepartment(
  user: { departmentId?: string },
  departmentIds: ReadonlySet<string>,
) {
  return !user.departmentId || !departmentIds.has(user.departmentId);
}

export async function getOverallAnalysisSummaryFromDynamo(
  companyId: string,
  startDate: string,
  endDate: string,
  departmentId?: string,
): Promise<OverallAnalysisSummary> {
  const region = readRequiredServerEnv("AWS_REGION");
  const [company, users, departments, monthlyStatsAll, missions, missionReportsAll, exchangeHistoryAll] = await Promise.all([
    getCompanyById(
      {
        region,
        tableName: readRequiredServerEnv("DDB_COMPANY_TABLE_NAME"),
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
    listDepartmentsByCompany(
      {
        region,
        tableName: readRequiredServerEnv("DDB_DEPARTMENT_TABLE_NAME"),
      },
      companyId,
    ),
    listUserMonthlyStatsByCompany(
      {
        region,
        tableName: readRequiredServerEnv("DDB_USER_MONTHLY_STATS_TABLE_NAME"),
      },
      companyId,
    ),
    listEnabledLatestMissionsByCompany(
      {
        region,
        tableName: readRequiredServerEnv("DDB_MISSION_TABLE_NAME"),
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
    listExchangeHistoryByCompany(
      {
        region,
        tableName: readRequiredServerEnv("DDB_EXCHANGE_HISTORY_TABLE_NAME"),
      },
      companyId,
    ),
  ]);

  const departmentIds = new Set(departments.map((item) => item.departmentId));
  const allCurrentUsers = users.filter((item) => item.status !== "DELETED");
  const analysisUsers = users.filter(isAnalysisTargetUser);
  const currentUsers = departmentId
    ? analysisUsers.filter((item) =>
        departmentId === UNASSIGNED_DEPARTMENT_FILTER
          ? isUserWithoutAssignedDepartment(item, departmentIds)
          : item.departmentId === departmentId,
      )
    : analysisUsers;
  const currentUserById = new Map(currentUsers.map((item) => [item.userId, item]));
  const filteredMonthlyStatsAll = monthlyStatsAll.filter((item) => {
    const user = currentUserById.get(item.userId);
    return Boolean(user && isUserStartedByMonth(user, item.yearMonth));
  });
  const filteredMissionReportsAll = missionReportsAll.filter((item) => {
    const user = currentUserById.get(item.userId);
    return Boolean(user && isUserStartedByDate(user, item.reportedAt.slice(0, 10)));
  });
  const filteredExchangeHistoryAll = exchangeHistoryAll.filter((item) => {
    const user = currentUserById.get(item.userId);
    return Boolean(user && isUserStartedByDate(user, item.exchangedAt.slice(0, 10)));
  });
  const displayMonths = listYearMonthsBetween(startDate, endDate);

  if (!company) {
    return {
      ...buildEmptySummary(),
      trendData: displayMonths.map((yearMonth) => ({
        month: formatYearMonth(yearMonth),
        averageScore: 0,
      })),
    };
  }

  const availableRange = mergeDateRanges([
    getMonthlyStatsDateRange(filteredMonthlyStatsAll),
    getDateRangeFromDateTimes(filteredMissionReportsAll.map((item) => item.reportedAt)),
    getDateRangeFromDateTimes(filteredExchangeHistoryAll.map((item) => item.exchangedAt)),
  ]);
  const effectiveRange = clampDateRange({ startDate, endDate }, availableRange);

  if (!effectiveRange) {
    return {
      ...buildEmptySummary(),
      trendData: displayMonths.map((yearMonth) => ({
        month: formatYearMonth(yearMonth),
        averageScore: 0,
      })),
    };
  }

  const months = listYearMonthsBetween(effectiveRange.startDate, effectiveRange.endDate);
  const monthlyStats = filteredMonthlyStatsAll.filter((item) => months.includes(item.yearMonth));
  const monthlyStatsByUserMonth = new Map<string, UserMonthlyStats>();
  for (const item of monthlyStats) {
    monthlyStatsByUserMonth.set(buildUserMonthKey(item.userId, item.yearMonth), item);
  }

  const trendData: OverallAnalysisTrendItem[] = displayMonths.map((yearMonth) => {
    if (!months.includes(yearMonth)) {
      return {
        month: formatYearMonth(yearMonth),
        averageScore: 0,
      };
    }

    const eligibleUsers = currentUsers.filter(
      (user) => getUserCoveredDaysInMonth(user, yearMonth, effectiveRange.startDate, effectiveRange.endDate) > 0,
    );

    if (eligibleUsers.length === 0) {
      return {
        month: formatYearMonth(yearMonth),
        averageScore: 0,
      };
    }

    const averageScore =
      eligibleUsers.reduce(
        (sum, user) => sum + (monthlyStatsByUserMonth.get(buildUserMonthKey(user.userId, yearMonth))?.earnedScore ?? 0),
        0,
      ) / eligibleUsers.length;

    return {
      month: formatYearMonth(yearMonth),
      averageScore: round(averageScore, 1),
    };
  });

  let totalScoreForAverage = 0;
  let totalUserMonthCount = 0;
  for (const yearMonth of months) {
    const eligibleUsers = currentUsers.filter(
      (user) => getUserCoveredDaysInMonth(user, yearMonth, effectiveRange.startDate, effectiveRange.endDate) > 0,
    );
    for (const user of eligibleUsers) {
      totalScoreForAverage += monthlyStatsByUserMonth.get(buildUserMonthKey(user.userId, yearMonth))?.earnedScore ?? 0;
      totalUserMonthCount += 1;
    }
  }

  const averageScore = totalUserMonthCount > 0 ? round(totalScoreForAverage / totalUserMonthCount, 1) : 0;
  const totalEarnedPoints = monthlyStats.reduce((sum, item) => sum + item.earnedPoints, 0);
  const approvedReportsInRange = filteredMissionReportsAll.filter((item) =>
    isWithinDateRange(item.reportedAt, effectiveRange.startDate, effectiveRange.endDate),
  );
  const reportCountByMissionId = new Map<string, number>();
  for (const report of approvedReportsInRange) {
    reportCountByMissionId.set(report.missionId, (reportCountByMissionId.get(report.missionId) ?? 0) + 1);
  }

  const achievementData: OverallAnalysisAchievementItem[] = missions.map((mission) => {
    let targetCount = 0;

    for (const yearMonth of months) {
      const coveredDays = getCoveredDaysInMonth(yearMonth, effectiveRange.startDate, effectiveRange.endDate);
      if (coveredDays === 0) {
        continue;
      }

      const daysInMonth = getDaysInMonth(yearMonth);
      const userMonthWeight = currentUsers.reduce(
        (sum, user) =>
          sum + getUserCoveredDaysInMonth(user, yearMonth, effectiveRange.startDate, effectiveRange.endDate) / daysInMonth,
        0,
      );
      targetCount += mission.monthlyCount * userMonthWeight;
    }

    const actualCount = reportCountByMissionId.get(mission.missionId) ?? 0;
    const percentage = targetCount > 0 ? Math.min(100, round((actualCount / targetCount) * 100, 1)) : 0;

    return {
      label: mission.title,
      percentage,
    };
  });

  const sortedMissions = [...achievementData].sort((a, b) => b.percentage - a.percentage || a.label.localeCompare(b.label, "ja"));
  const topCount = Math.min(3, sortedMissions.length);
  const bottomCount = Math.min(3, Math.max(0, sortedMissions.length - topCount));
  const goodMissions: OverallAnalysisMissionItem[] = sortedMissions.slice(0, topCount).map((item) => ({
    name: item.label,
    percentage: item.percentage,
  }));
  const improvementMissions: OverallAnalysisMissionItem[] = [...sortedMissions]
    .reverse()
    .slice(0, bottomCount)
    .map((item) => ({
      name: item.label,
      percentage: item.percentage,
    }));

  const userNameById = new Map(allCurrentUsers.map((item) => [item.userId, joinNameParts(item.lastName, item.firstName)]));
  const exchangeHistory: OverallExchangeHistoryItem[] = filteredExchangeHistoryAll
    .filter((item) => isWithinDateRange(item.exchangedAt, effectiveRange.startDate, effectiveRange.endDate))
    .sort((a, b) => new Date(b.exchangedAt).getTime() - new Date(a.exchangedAt).getTime())
    .map((item) => ({
      date: item.exchangedAt,
      employeeName: userNameById.get(item.userId) ?? item.userId,
      merchandiseName: item.merchandiseNameSnapshot,
      usedPoint: item.usedPoint,
      status: "完了",
    }));

  return {
    averageScore,
    totalEarnedPoints,
    totalUsedPoints: exchangeHistory.reduce((sum, item) => sum + item.usedPoint, 0),
    trendData,
    achievementData,
    goodMissions,
    improvementMissions,
    exchangeHistory,
  };
}
