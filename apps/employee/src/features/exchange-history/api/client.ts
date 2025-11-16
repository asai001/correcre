import type { ExchangeHistory } from "../model/types";

/**
 * ダッシュボード用の直近の交換履歴を取得
 */
export async function fetchExchangeHistory(companyId: string, userId: string, limit = 10): Promise<ExchangeHistory[]> {
  const params = new URLSearchParams({ companyId, userId, limit: String(limit) }).toString();

  const res = await fetch(`/api/exchange-history?${params}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("fetchExchangeHistory error", res.status, await res.text());
    throw new Error("交換履歴の取得に失敗しました");
  }

  const data = (await res.json()) as ExchangeHistory[] | null;

  return data ?? [];
}
