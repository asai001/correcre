import type { ExchangeHistory } from "../model/types";
import data from "../../../../../mock/dynamodb.json";

/**
 * DynamoDB 上の 1 件分のイメージ
 */
type ExchangeHistoryRecord = {
  companyId: string;
  userId: string;
  exchangeId: string;
  exchangedAt: string; // ISO 文字列 "2025-10-25T10:00:00+09:00" など
  merchandiseName: string;
  usedPoint: number;
};

/**
 * 指定ユーザーの交換履歴（生データ）を取得
 */
async function getExchangeHistoryRaw(companyId: string, userId: string): Promise<ExchangeHistoryRecord[]> {
  const items = (data as any).ExchangeHistory as ExchangeHistoryRecord[] | undefined;

  if (!items) {
    return [];
  }

  return items.filter((i) => i.companyId === companyId && i.userId === userId);
}

/**
 * ダッシュボード用に整形した交換履歴（最新 limit 件）を返す
 */
export const getExchangeHistoryFromDynamoMock = async (companyId: string, userId: string, limit = 10): Promise<ExchangeHistory[]> => {
  const raw = await getExchangeHistoryRaw(companyId, userId);

  // exchangedAt の降順（新しい順）にソート
  const sorted = raw.slice().sort((a, b) => (a.exchangedAt < b.exchangedAt ? 1 : -1));

  const picked = sorted.slice(0, limit);

  return picked.map((r) => ({
    date: r.exchangedAt.slice(0, 10), // "YYYY-MM-DD" 部分だけ切り出し
    merchandiseName: r.merchandiseName,
    usedPoint: r.usedPoint,
  }));
};
