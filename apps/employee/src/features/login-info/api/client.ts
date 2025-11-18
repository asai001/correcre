import { LoginInfo } from "../model/types";

export async function fetchLoginInfoForDashboard(companyId: string, userId: string): Promise<LoginInfo | null> {
  const params = new URLSearchParams({ companyId, userId }).toString();

  const res = await fetch(`/api/user?${params}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    // ここで 404/500 を見て適宜ハンドリング
    console.error("fetchLoginInfo error", res.status, await res.text());
    throw new Error("ユーザー情報の取得に失敗しました");
  }

  const data = (await res.json()) as LoginInfo | null;

  return data;
}
