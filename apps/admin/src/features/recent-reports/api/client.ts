import type { RecentReport } from "../model/types";

export async function fetchRecentReports(
  companyId: string,
  limit: number = 5,
  userId?: string,
  startDate?: string,
  endDate?: string,
  signal?: AbortSignal
): Promise<RecentReport[]> {
  const params = new URLSearchParams({
    companyId,
    limit: String(limit),
  });

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
    throw new Error("\u5831\u544a\u5185\u5bb9\u306e\u53d6\u5f97\u306b\u5931\u6557\u3057\u307e\u3057\u305f");
  }

  const data = (await res.json()) as RecentReport[] | null;

  return data ?? [];
}
