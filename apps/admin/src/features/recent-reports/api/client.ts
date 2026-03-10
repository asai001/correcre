import type { RecentReport } from "../model/types";

export async function fetchRecentReports(companyId: string, limit: number = 5, userId?: string): Promise<RecentReport[]> {
  const params = new URLSearchParams({
    companyId,
    limit: String(limit),
  });

  if (userId) {
    params.set("userId", userId);
  }

  const res = await fetch(`/api/recent-reports?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("fetchRecentReports error", res.status, await res.text());
    throw new Error("直近の報告内容の取得に失敗しました");
  }

  const data = (await res.json()) as RecentReport[] | null;

  return data ?? [];
}
