import type { RecentReport } from "../model/types";

/**
 * ダッシュボード用の「直近の報告内容」を取得
 */
export async function fetchRecentReports(companyId: string, limit: number = 5): Promise<RecentReport[]> {
  const params = new URLSearchParams({
    companyId,
    limit: String(limit),
  }).toString();

  const res = await fetch(`/api/recent-reports?${params}`, {
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
