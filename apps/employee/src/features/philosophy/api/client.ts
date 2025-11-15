import type { Philosophy } from "../model/types";

export async function fetchPhilosophy(companyId: string): Promise<Philosophy | null> {
  const params = new URLSearchParams({ companyId }).toString();

  const res = await fetch(`/api/philosophy?${params}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    // ここで 404/500 を見て適宜ハンドリング
    console.error("fetchPhilosophy error", res.status, await res.text());
    throw new Error("理念情報の取得に失敗しました");
  }

  const data = (await res.json()) as Philosophy | null;

  return data;
}
