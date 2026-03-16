import type { ExchangeHistory } from "../model/types";

export async function fetchExchangeHistory(
  companyId: string,
  userId: string,
  limit?: number,
  signal?: AbortSignal
): Promise<ExchangeHistory[]> {
  const params = new URLSearchParams({ companyId, userId });

  if (typeof limit === "number") {
    params.set("limit", String(limit));
  }

  const res = await fetch(`/api/exchange-history?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  if (!res.ok) {
    console.error("fetchExchangeHistory error", res.status, await res.text());
    throw new Error("交換履歴の取得に失敗しました");
  }

  const data = (await res.json()) as ExchangeHistory[] | null;

  return data ?? [];
}
