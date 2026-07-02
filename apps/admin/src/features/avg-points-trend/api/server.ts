import { toYYYYMM } from "@correcre/lib";
import { listUsersByCompany } from "@correcre/lib/dynamodb/user";
import { listUserMonthlyStatsByCompany } from "@correcre/lib/dynamodb/user-monthly-stats";
import { readRequiredServerEnv } from "@correcre/lib/env/server";

import type { DBUserItem } from "@correcre/types";

import type { AvgPointsTrendItem } from "../model/types";

type AnalysisUser = Pick<DBUserItem, "userId" | "status" | "roles" | "joinedAt" | "createdAt">;

function shiftYearMonth(baseYm: string, monthOffset: number): string {
  const [yearStr, monthStr] = baseYm.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const date = new Date(year, month - 1 + monthOffset, 1);

  return toYYYYMM(date);
}

function getDaysInMonth(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function toUtcDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function isAnalysisTargetUser(user: AnalysisUser) {
  return user.status === "ACTIVE" && user.roles.includes("EMPLOYEE");
}

function getUserStartDate(user: Pick<AnalysisUser, "joinedAt" | "createdAt">) {
  const startDate = user.joinedAt?.trim() || user.createdAt?.slice(0, 10) || "";
  return /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? startDate : "";
}

function getUserCoveredDaysInMonth(user: Pick<AnalysisUser, "joinedAt" | "createdAt">, yearMonth: string) {
  const monthStart = `${yearMonth}-01`;
  const monthEnd = `${yearMonth}-${String(getDaysInMonth(yearMonth)).padStart(2, "0")}`;
  const startDate = getUserStartDate(user);
  const effectiveStartDate = startDate && startDate > monthStart ? startDate : monthStart;
  const start = toUtcDate(effectiveStartDate);
  const end = toUtcDate(monthEnd);

  if (start > end) {
    return 0;
  }

  return Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
}

function buildUserMonthKey(userId: string, yearMonth: string) {
  return `${userId}:${yearMonth}`;
}

export async function getAvgPointsTrendFromDynamo(
  companyId: string,
  months = 12,
  endYm?: string,
): Promise<AvgPointsTrendItem[] | null> {
  const safeMonths = !months || months < 1 || !Number.isFinite(months) ? 12 : months;
  const endYearMonth = endYm ?? shiftYearMonth(toYYYYMM(new Date()), -1);
  const startYearMonth = shiftYearMonth(endYearMonth, -(safeMonths - 1));
  const region = readRequiredServerEnv("AWS_REGION");
  const [stats, users] = await Promise.all([
    listUserMonthlyStatsByCompany(
      {
        region,
        tableName: readRequiredServerEnv("DDB_USER_MONTHLY_STATS_TABLE_NAME"),
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
  ]);

  const analysisUsers = users.filter(isAnalysisTargetUser);
  const statsByUserMonth = new Map<string, number>();
  for (const stat of stats) {
    if (stat.yearMonth < startYearMonth || stat.yearMonth > endYearMonth) {
      continue;
    }

    statsByUserMonth.set(buildUserMonthKey(stat.userId, stat.yearMonth), stat.earnedScore);
  }

  const items: AvgPointsTrendItem[] = [];
  let cursor = startYearMonth;
  while (true) {
    const eligibleUsers = analysisUsers.filter((user) => getUserCoveredDaysInMonth(user, cursor) > 0);
    const avg =
      eligibleUsers.length > 0
        ? eligibleUsers.reduce((sum, user) => sum + (statsByUserMonth.get(buildUserMonthKey(user.userId, cursor)) ?? 0), 0) /
          eligibleUsers.length
        : 0;
    items.push({
      yearMonth: cursor,
      avgEarnedScore: Math.round(avg * 100) / 100,
    });

    if (cursor === endYearMonth) {
      break;
    }

    cursor = shiftYearMonth(cursor, 1);
  }

  return items;
}
