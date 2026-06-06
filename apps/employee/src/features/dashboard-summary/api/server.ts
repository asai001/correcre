import { isValidYYYYMM, toYYYYMM } from "@correcre/lib";
import { getUserByCompanyAndUserId } from "@correcre/lib/dynamodb/user";
import { getUserMonthlyStatsByCompanyUserAndYearMonth } from "@correcre/lib/dynamodb/user-monthly-stats";
import { readRequiredServerEnv } from "@correcre/lib/env/server";

import type { DashboardSummary } from "../model/types";

const MONTHLY_FULL_SCORE = 100;

function shiftYearMonth(baseYm: string, monthOffset: number) {
  const [year, month] = baseYm.split("-").map(Number);
  const date = new Date(year, month - 1 + monthOffset, 1);

  return toYYYYMM(date);
}

function toEarnedScoreRate(earnedScore: number | undefined): number {
  if (typeof earnedScore !== "number" || !Number.isFinite(earnedScore)) {
    return 0;
  }

  return Math.min(MONTHLY_FULL_SCORE, Math.max(0, Math.round(earnedScore)));
}

export async function getDashboardSummaryFromDynamo(
  companyId: string,
  userId: string,
  targetYearMonth: string,
): Promise<DashboardSummary | null> {
  if (!isValidYYYYMM(targetYearMonth)) {
    return null;
  }

  const region = readRequiredServerEnv("AWS_REGION");
  const userTableName = readRequiredServerEnv("DDB_USER_TABLE_NAME");
  const userMonthlyStatsTableName = readRequiredServerEnv("DDB_USER_MONTHLY_STATS_TABLE_NAME");
  const lastYearMonth = shiftYearMonth(targetYearMonth, -1);

  const [user, currentMonthStats, lastMonthStats] = await Promise.all([
    getUserByCompanyAndUserId(
      {
        region,
        tableName: userTableName,
      },
      companyId,
      userId,
    ),
    getUserMonthlyStatsByCompanyUserAndYearMonth(
      {
        region,
        tableName: userMonthlyStatsTableName,
      },
      companyId,
      userId,
      targetYearMonth,
    ),
    getUserMonthlyStatsByCompanyUserAndYearMonth(
      {
        region,
        tableName: userMonthlyStatsTableName,
      },
      companyId,
      userId,
      lastYearMonth,
    ),
  ]);

  if (!user || user.status === "DELETED") {
    return null;
  }

  return {
    thisMonthCompletionRate: toEarnedScoreRate(currentMonthStats?.earnedScore),
    currentPointBalance: user.currentPointBalance ?? 0,
    lastMonthEarnedPoints: lastMonthStats?.earnedPoints ?? 0,
  };
}
