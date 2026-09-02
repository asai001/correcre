import "server-only";

import { listExchangeHistoryByMerchant } from "@correcre/lib/dynamodb/exchange-history";
import { listMerchandiseByMerchant } from "@correcre/lib/dynamodb/merchandise";
import { getMerchantById } from "@correcre/lib/dynamodb/merchant";
import { getMerchantCalendar } from "@correcre/lib/dynamodb/merchant-calendar";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import {
  buildMerchantTodos,
  listTodoExchangeIds,
  withApplicantNames,
  type MerchantTodo,
} from "@correcre/lib/merchant/dashboard-todos";
import { getUserByCompanyAndUserId } from "@correcre/lib/dynamodb/user";
import { joinNameParts } from "@correcre/lib/user-profile";
import type { ExchangeHistoryItem, ExchangeHistoryStatus } from "@correcre/types";

export type DashboardKpi = {
  publishedMerchandiseCount: number;
  draftMerchandiseCount: number;
  unpublishedMerchandiseCount: number;
  monthlyExchangeCount: number;
  monthlyCompletedCount: number;
  monthlyCompletionRate: number;
  pendingExchangeCount: number;
  inProgressExchangeCount: number;
  completedTotalCount: number;
};

export type DashboardRecentExchange = {
  exchangeId: string;
  status: ExchangeHistoryStatus;
  merchandiseId: string;
  merchandiseName: string;
  exchangedAt: string;
  usedPoint: number;
};

export type DashboardData = {
  kpi: DashboardKpi;
  recentExchanges: DashboardRecentExchange[];
  // 「やることリスト」。緊急度の高い順に並んでいる（並べ替えは buildMerchantTodos の責務）
  todos: MerchantTodo[];
};

function getCurrentYearMonthRange(now: Date): { startIso: string; endIso: string } {
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

// やることリストに実際に表示される明細の分だけ、申込者名を引く。
// ダッシュボードは最初に開く画面なので、交換の全件ではなく表示分（各やること最大 5 件）に限定する。
// 名前が引けなかった従業員は名前なしで表示する（ここで失敗させない）。
async function resolveApplicantNames(
  region: string,
  exchanges: ExchangeHistoryItem[],
  exchangeIds: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (exchangeIds.length === 0) {
    return result;
  }

  const tableName = readRequiredServerEnv("DDB_USER_TABLE_NAME");
  const targets = new Set(exchangeIds);
  const nameByUser = new Map<string, string | null>();

  for (const item of exchanges) {
    if (!targets.has(item.exchangeId)) continue;

    const userKey = `${item.companyId}#${item.userId}`;
    if (!nameByUser.has(userKey)) {
      try {
        const user = await getUserByCompanyAndUserId({ region, tableName }, item.companyId, item.userId);
        nameByUser.set(userKey, user ? joinNameParts(user.lastName, user.firstName) || null : null);
      } catch (error) {
        console.error("failed to resolve applicant name for merchant dashboard", { userKey, error });
        nameByUser.set(userKey, null);
      }
    }

    const name = nameByUser.get(userKey);
    if (name) {
      result.set(item.exchangeId, name);
    }
  }

  return result;
}

export async function getMerchantDashboardData(
  merchantId: string,
  // 収支・精算は MERCHANT_ADMIN 専用のため、請求のやることは管理者にだけ出す
  options: { isAdmin: boolean } = { isAdmin: false },
): Promise<DashboardData> {
  const region = readRequiredServerEnv("AWS_REGION");
  const merchandiseTableName = readRequiredServerEnv("DDB_MERCHANDISE_TABLE_NAME");
  const exchangeHistoryTableName = readRequiredServerEnv("DDB_EXCHANGE_HISTORY_TABLE_NAME");
  const merchantCalendarTableName = readRequiredServerEnv("DDB_MERCHANT_CALENDAR_TABLE_NAME");
  const merchantTableName = readRequiredServerEnv("DDB_MERCHANT_TABLE_NAME");

  const [merchandiseItems, exchanges, calendar, merchant] = await Promise.all([
    listMerchandiseByMerchant({ region, tableName: merchandiseTableName }, merchantId),
    listExchangeHistoryByMerchant({ region, tableName: exchangeHistoryTableName }, merchantId),
    getMerchantCalendar({ region, tableName: merchantCalendarTableName }, merchantId),
    getMerchantById({ region, tableName: merchantTableName }, merchantId),
  ]);

  const { startIso, endIso } = getCurrentYearMonthRange(new Date());

  const monthly = exchanges.filter((item) => item.exchangedAt >= startIso && item.exchangedAt < endIso);
  const monthlyCompleted = monthly.filter((item) => item.status === "COMPLETED");
  const monthlyCompletionRate =
    monthly.length === 0 ? 0 : monthlyCompleted.length / monthly.length;

  const publishedMerchandiseCount = merchandiseItems.filter((item) => item.status === "PUBLISHED").length;
  const draftMerchandiseCount = merchandiseItems.filter((item) => item.status === "DRAFT").length;
  const unpublishedMerchandiseCount = merchandiseItems.filter((item) => item.status === "UNPUBLISHED").length;

  const pendingExchangeCount = exchanges.filter((item) => item.status === "REQUESTED").length;
  const inProgressExchangeCount = exchanges.filter(
    (item) => item.status === "PREPARING" || item.status === "IN_PROGRESS",
  ).length;
  const completedTotalCount = exchanges.filter((item) => item.status === "COMPLETED").length;

  const recentExchanges: DashboardRecentExchange[] = [...exchanges]
    .sort((a, b) => (a.exchangedAt < b.exchangedAt ? 1 : -1))
    .slice(0, 5)
    .map((item: ExchangeHistoryItem) => ({
      exchangeId: item.exchangeId,
      status: item.status ?? "COMPLETED",
      merchandiseId: item.merchandiseId ?? "",
      merchandiseName: item.merchandiseNameSnapshot ?? item.merchandiseId ?? "",
      exchangedAt: item.exchangedAt,
      usedPoint: item.usedPoint,
    }));

  const rawTodos = buildMerchantTodos({
    now: new Date(),
    exchanges,
    merchandise: merchandiseItems,
    calendar,
    isAdmin: options.isAdmin,
    invoiceEmailSentMonths: merchant?.invoiceEmailSentMonths,
  });
  const todos = withApplicantNames(
    rawTodos,
    await resolveApplicantNames(region, exchanges, listTodoExchangeIds(rawTodos)),
  );

  return {
    kpi: {
      publishedMerchandiseCount,
      draftMerchandiseCount,
      unpublishedMerchandiseCount,
      monthlyExchangeCount: monthly.length,
      monthlyCompletedCount: monthlyCompleted.length,
      monthlyCompletionRate,
      pendingExchangeCount,
      inProgressExchangeCount,
      completedTotalCount,
    },
    recentExchanges,
    todos,
  };
}
