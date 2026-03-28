import type { RecentReport } from "../model/types";

export async function fetchRecentReports(
  companyId: string,
  limit?: number,
  userId?: string,
  startDate?: string,
  endDate?: string,
  signal?: AbortSignal
): Promise<RecentReport[]> {
  const params = new URLSearchParams({
    companyId,
  });

  if (typeof limit === "number") {
    params.set("limit", String(limit));
  }

  if (userId) {
    params.set("userId", userId);
  }

  if (startDate) {
    params.set("startDate", startDate);
  }

  if (endDate) {
    params.set("endDate", endDate);
  }

  const res = await fetch(`/api/recent-reports?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  if (!res.ok) {
    console.error("fetchRecentReports error", res.status, await res.text());
    throw new Error("報告内容の取得に失敗しました");
  }

  const data = (await res.json()) as RecentReport[] | null;

  return data ?? [];
}
