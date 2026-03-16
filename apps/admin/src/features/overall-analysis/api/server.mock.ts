import data from "../../../../../mock/dynamodb.json";
import type {
  OverallAnalysisAchievementItem,
  OverallAnalysisMissionItem,
  OverallAnalysisSummary,
  OverallAnalysisTrendItem,
  OverallExchangeHistoryItem,
} from "../model/types";

type CompanyRecord = {
  companyId: string;
  totalEmployees?: number;
  activeEmployees: number;
  companyPointBalance: number;
};

type UserRecord = {
  companyId: string;
  userId: string;
  name: string;
};

type UserMonthlyStatsRecord = {
  companyUserKey: string;
  yearMonth: string;
  earnedPoints: number;
  earnedScore: number;
};

type MissionRecord = {
  companyId: string;
  missionId: string;
  enabled: boolean;
  title: string;
  monthlyCount: number;
  order?: number;
};

type MissionReportRecord = {
  companyId: string;
  userId: string;
  missionId: string;
  reportedAt: string;
  status: string;
};

type ExchangeHistoryRecord = {
  companyId: string;
  userId: string;
  exchangedAt: string;
  merchandiseName: string;
  usedPoint: number;
};

type DateRange = {
  startDate: string;
  endDate: string;
};

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

function getMonthlyStatsDateRange(items: UserMonthlyStatsRecord[]): DateRange | null {
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

function buildEmptySummary(company?: CompanyRecord | null): OverallAnalysisSummary {
  return {
    averageScore: 0,
    totalEarnedPoints: 0,
    companyPointBalance: company?.companyPointBalance ?? 0,
    trendData: [],
    achievementData: [],
    goodMissions: [],
    improvementMissions: [],
    exchangeHistory: [],
  };
}

export async function getOverallAnalysisSummaryFromDynamoMock(
  companyId: string,
  startDate: string,
  endDate: string
): Promise<OverallAnalysisSummary> {
  const companies = ((data as { Company?: CompanyRecord[] }).Company ?? []) as CompanyRecord[];
  const users = ((data as { User?: UserRecord[] }).User ?? []).filter((item) => item.companyId === companyId) as UserRecord[];
  const monthlyStatsAll = ((data as { UserMonthlyStats?: UserMonthlyStatsRecord[] }).UserMonthlyStats ?? []).filter((item) =>
    item.companyUserKey.startsWith(`${companyId}#`)
  ) as UserMonthlyStatsRecord[];
  const missions = ((data as { Mission?: MissionRecord[] }).Mission ?? [])
    .filter((item) => item.companyId === companyId && item.enabled)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title, "ja")) as MissionRecord[];
  const missionReportsAll = ((data as { MissionReports?: MissionReportRecord[] }).MissionReports ?? []).filter(
    (item) => item.companyId === companyId && item.status === "APPROVED"
  ) as MissionReportRecord[];
  const exchangeHistoryAll = ((data as { ExchangeHistory?: ExchangeHistoryRecord[] }).ExchangeHistory ?? []).filter(
    (item) => item.companyId === companyId
  ) as ExchangeHistoryRecord[];
  const company = companies.find((item) => item.companyId === companyId);

  const displayMonths = listYearMonthsBetween(startDate, endDate);

  if (!company) {
    return {
      ...buildEmptySummary(null),
      trendData: displayMonths.map((yearMonth) => ({
        month: formatYearMonth(yearMonth),
        averageScore: 0,
      })),
    };
  }

  const availableRange = mergeDateRanges([
    getMonthlyStatsDateRange(monthlyStatsAll),
    getDateRangeFromDateTimes(missionReportsAll.map((item) => item.reportedAt)),
    getDateRangeFromDateTimes(exchangeHistoryAll.map((item) => item.exchangedAt)),
  ]);
  const effectiveRange = clampDateRange({ startDate, endDate }, availableRange);

  if (!effectiveRange) {
    return {
      ...buildEmptySummary(company),
      trendData: displayMonths.map((yearMonth) => ({
        month: formatYearMonth(yearMonth),
        averageScore: 0,
      })),
    };
  }

  const months = listYearMonthsBetween(effectiveRange.startDate, effectiveRange.endDate);
  const monthlyStats = monthlyStatsAll.filter((item) => months.includes(item.yearMonth));
  const monthlyStatsByMonth = new Map<string, UserMonthlyStatsRecord[]>();
  for (const item of monthlyStats) {
    const rows = monthlyStatsByMonth.get(item.yearMonth) ?? [];
    rows.push(item);
    monthlyStatsByMonth.set(item.yearMonth, rows);
  }

  const trendData: OverallAnalysisTrendItem[] = displayMonths.map((yearMonth) => {
    const statsInMonth = monthlyStatsByMonth.get(yearMonth) ?? [];

    if (statsInMonth.length === 0) {
      return {
        month: formatYearMonth(yearMonth),
        averageScore: 0,
      };
    }

    const averageScore = statsInMonth.reduce((sum, item) => sum + item.earnedScore, 0) / statsInMonth.length;

    return {
      month: formatYearMonth(yearMonth),
      averageScore: round(averageScore, 1),
    };
  });

  const averageScore =
    monthlyStats.length > 0 ? round(monthlyStats.reduce((sum, item) => sum + item.earnedScore, 0) / monthlyStats.length, 1) : 0;
  const totalEarnedPoints = monthlyStats.reduce((sum, item) => sum + item.earnedPoints, 0);
  const userCount = users.length > 0 ? users.length : new Set(monthlyStatsAll.map((item) => item.companyUserKey)).size;
  const approvedReportsInRange = missionReportsAll.filter((item) =>
    isWithinDateRange(item.reportedAt, effectiveRange.startDate, effectiveRange.endDate)
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

      targetCount += (mission.monthlyCount * userCount * coveredDays) / getDaysInMonth(yearMonth);
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

  const userNameById = new Map(users.map((item) => [item.userId, item.name]));
  const exchangeHistory: OverallExchangeHistoryItem[] = exchangeHistoryAll
    .filter((item) => isWithinDateRange(item.exchangedAt, effectiveRange.startDate, effectiveRange.endDate))
    .sort((a, b) => new Date(b.exchangedAt).getTime() - new Date(a.exchangedAt).getTime())
    .map((item) => ({
      date: item.exchangedAt,
      employeeName: userNameById.get(item.userId) ?? item.userId,
      merchandiseName: item.merchandiseName,
      usedPoint: item.usedPoint,
      status: "完了",
    }));

  return {
    averageScore,
    totalEarnedPoints,
    companyPointBalance: company.companyPointBalance,
    trendData,
    achievementData,
    goodMissions,
    improvementMissions,
    exchangeHistory,
  };
}
