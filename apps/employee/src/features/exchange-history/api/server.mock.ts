import data from "../../../../../mock/dynamodb.json";
import type { ExchangeHistory } from "../model/types";

type ExchangeHistoryRecord = {
  companyId: string;
  userId: string;
  exchangeId: string;
  exchangedAt: string;
  merchandiseName: string;
  usedPoint: number;
};

async function getExchangeHistoryRaw(companyId: string, userId: string): Promise<ExchangeHistoryRecord[]> {
  const items = (data as { ExchangeHistory?: ExchangeHistoryRecord[] }).ExchangeHistory;

  if (!items) {
    return [];
  }

  return items.filter((item) => item.companyId === companyId && item.userId === userId);
}

export const getExchangeHistoryFromDynamoMock = async (
  companyId: string,
  userId: string,
  limit?: number
): Promise<ExchangeHistory[]> => {
  const raw = await getExchangeHistoryRaw(companyId, userId);
  const sorted = raw.slice().sort((a, b) => (a.exchangedAt < b.exchangedAt ? 1 : -1));
  const picked = typeof limit === "number" ? sorted.slice(0, limit) : sorted;

  return picked.map((item) => ({
    date: item.exchangedAt.slice(0, 10),
    merchandiseName: item.merchandiseName,
    usedPoint: item.usedPoint,
  }));
};
