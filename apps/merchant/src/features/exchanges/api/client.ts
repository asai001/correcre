import type {
  ExchangeDetail,
  ExchangeListFilter,
  ExchangeSummary,
  TransitionExchangeRequest,
} from "../model/types";

async function parseError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? fallback;
}

export async function fetchExchanges(filter: ExchangeListFilter = "ALL"): Promise<ExchangeSummary[]> {
  const search = filter === "ALL" ? "" : `?status=${encodeURIComponent(filter)}`;
  const res = await fetch(`/api/exchanges${search}`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(await parseError(res, "交換一覧の取得に失敗しました。"));
  }

  return (await res.json()) as ExchangeSummary[];
}

export async function fetchExchangeDetail(exchangeId: string): Promise<ExchangeDetail> {
  const res = await fetch(`/api/exchanges/${encodeURIComponent(exchangeId)}`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(await parseError(res, "交換詳細の取得に失敗しました。"));
  }

  return (await res.json()) as ExchangeDetail;
}

export async function transitionExchange(
  exchangeId: string,
  body: TransitionExchangeRequest,
): Promise<ExchangeDetail> {
  const res = await fetch(`/api/exchanges/${encodeURIComponent(exchangeId)}/transition`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "状態の更新に失敗しました。"));
  }

  return (await res.json()) as ExchangeDetail;
}
