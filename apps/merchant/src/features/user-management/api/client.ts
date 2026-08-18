import type { InviteMerchantUserInput, MerchantUserRow } from "../model/types";

async function parseError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? fallback;
}

export async function inviteMerchantUser(input: InviteMerchantUserInput): Promise<MerchantUserRow> {
  const res = await fetch("/api/users", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "ユーザーの招待に失敗しました。"));
  }

  return (await res.json()) as MerchantUserRow;
}
