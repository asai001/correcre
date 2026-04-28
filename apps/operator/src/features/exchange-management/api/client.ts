import type {
  OperatorExchangeDetail,
  OperatorExchangeFilter,
  OperatorExchangeSummary,
  TransitionOperatorExchangeRequest,
} from "../model/types";

async function parseError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? fallback;
}

export async function fetchExchanges(
  filter: OperatorExchangeFilter = "ALL",
  merchantId?: string,
): Promise<OperatorExchangeSummary[]> {
  const params = new URLSearchParams();
  if (filter !== "ALL") params.set("status", filter);
  if (merchantId) params.set("merchantId", merchantId);
  const search = params.size > 0 ? `?${params.toString()}` : "";

  const res = await fetch(`/api/exchanges${search}`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(await parseError(res, "交換一覧の取得に失敗しました。"));
  }

  return (await res.json()) as OperatorExchangeSummary[];
}

export async function transitionExchange(
  merchantId: string,
  exchangeId: string,
  body: TransitionOperatorExchangeRequest,
): Promise<OperatorExchangeDetail> {
  const res = await fetch(
    `/api/exchanges/${encodeURIComponent(merchantId)}/${encodeURIComponent(exchangeId)}/transition`,
    {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    throw new Error(await parseError(res, "状態の更新に失敗しました。"));
  }

  return (await res.json()) as OperatorExchangeDetail;
}
