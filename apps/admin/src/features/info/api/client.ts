import type { UpdateAdminCompanyInfoInput } from "../model/types";

export async function updateAdminCompanyInfo(input: UpdateAdminCompanyInfoInput) {
  const res = await fetch("/api/company-info", {
    method: "PATCH",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "各種情報の更新に失敗しました");
  }

  return (await res.json()) as { ok: true; updatedAt: string };
}
