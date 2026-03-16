import { toYYYYMM } from "@correcre/lib";
import data from "../../../../../mock/dynamodb.json";
import type { MonthlyPointsHistoryItem } from "../model/types";

type MissionReportRecord = {
  companyId: string;
  userId: string;
  reportedAt: string;
  status: "APPROVED" | "PENDING";
  scoreGranted?: number;
};

function shiftYearMonth(baseYm: string, monthOffset: number): string {
  const [yStr, mStr] = baseYm.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = new Date(y, m - 1 + monthOffset, 1);
  return toYYYYMM(d);
}

function listYearMonths(startYearMonth: string, months: number): string[] {
  return Array.from({ length: months }, (_unused, index) => shiftYearMonth(startYearMonth, index));
}

export async function getMonthlyPointsHistoryFromDynamoMock(
  companyId: string,
  userId: string,
  months = 24,
  endYm?: string
): Promise<MonthlyPointsHistoryItem[]> {
  const items = ((data as { MissionReports?: MissionReportRecord[] }).MissionReports ?? []) as MissionReportRecord[];
  const endYearMonth = endYm ?? shiftYearMonth(toYYYYMM(new Date()), -1);
  const startYearMonth = shiftYearMonth(endYearMonth, -(months - 1));
  const yearMonths = listYearMonths(startYearMonth, months);
  const totalsByMonth = new Map<string, number>();

  items.forEach((item) => {
    if (item.companyId !== companyId || item.userId !== userId || item.status !== "APPROVED") {
      return;
    }

    const yearMonth = toYYYYMM(new Date(item.reportedAt));
    if (yearMonth < startYearMonth || yearMonth > endYearMonth) {
      return;
    }

    totalsByMonth.set(yearMonth, (totalsByMonth.get(yearMonth) ?? 0) + (item.scoreGranted ?? 0));
  });

  return yearMonths.map((yearMonth) => ({
    yearMonth,
    earnedScore: totalsByMonth.get(yearMonth) ?? 0,
  }));
}
