import type { SendMerchantBroadcastInput, SendMerchantBroadcastResult } from "../model/types";

async function parseError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? fallback;
}

export async function sendMerchantBroadcast(input: SendMerchantBroadcastInput): Promise<SendMerchantBroadcastResult> {
  const res = await fetch("/api/merchant-broadcast", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "メールの送信に失敗しました。"));
  }

  return (await res.json()) as SendMerchantBroadcastResult;
}
