import { UserForDashboard } from "./../model/types";

export async function fetchCurrentUserForDashboard(companyId: string, userId: string): Promise<UserForDashboard | null> {
  const params = new URLSearchParams({ companyId, userId }).toString();

  const res = await fetch(`/api/user?${params}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    // ここで 404/500 を見て適宜ハンドリング
    console.error("fetchPhilosophy error", res.status, await res.text());
    throw new Error("理念情報の取得に失敗しました");
  }

  const data = (await res.json()) as UserForDashboard | null;

  return data;
}
