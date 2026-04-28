import { listExchangeHistoryByCompanyAndUser } from "@correcre/lib/dynamodb/exchange-history";
import { readRequiredServerEnv } from "@correcre/lib/env/server";

import type { ExchangeHistory } from "../model/types";

function isWithinDateRange(dateTime: string, startDate?: string, endDate?: string) {
  const date = dateTime.slice(0, 10);
  return (!startDate || date >= startDate) && (!endDate || date <= endDate);
}

export async function getExchangeHistoryFromDynamo(
  companyId: string,
  userId: string,
  startDate?: string,
  endDate?: string,
  limit?: number,
): Promise<ExchangeHistory[]> {
  const items = await listExchangeHistoryByCompanyAndUser(
    {
      region: readRequiredServerEnv("AWS_REGION"),
      tableName: readRequiredServerEnv("DDB_EXCHANGE_HISTORY_TABLE_NAME"),
    },
    companyId,
    userId,
  );

  const sortedItems = items
    .filter((item) => isWithinDateRange(item.exchangedAt, startDate, endDate))
    .sort((a, b) => (a.exchangedAt < b.exchangedAt ? 1 : -1));
  const pickedItems = typeof limit === "number" ? sortedItems.slice(0, limit) : sortedItems;

  return pickedItems.map((item) => ({
    date: item.exchangedAt.slice(0, 10),
    merchandiseName: item.merchandiseNameSnapshot,
    usedPoint: item.usedPoint,
    status: item.status,
  }));
}
