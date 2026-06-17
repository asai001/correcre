import type { MerchantCompanyInfo, UpdateMerchantCompanyInfoInput } from "../model/types";

async function parseError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? fallback;
}

export async function updateCompanyInfo(
  input: UpdateMerchantCompanyInfoInput,
): Promise<MerchantCompanyInfo> {
  const res = await fetch("/api/company-info", {
    method: "PATCH",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "会社情報の更新に失敗しました。"));
  }

  return (await res.json()) as MerchantCompanyInfo;
}
