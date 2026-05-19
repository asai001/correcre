import type { RequestExchangeResponse } from "../model/types";

async function parseError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
  return data?.message ?? data?.error ?? fallback;
}

export async function requestExchange(params: {
  merchantId: string;
  merchandiseId: string;
}): Promise<RequestExchangeResponse> {
  const res = await fetch(
    `/api/exchange/${encodeURIComponent(params.merchandiseId)}/request`,
    {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchantId: params.merchantId }),
    },
  );

  if (!res.ok) {
    throw new Error(await parseError(res, "交換申請に失敗しました"));
  }

  return (await res.json()) as RequestExchangeResponse;
}
