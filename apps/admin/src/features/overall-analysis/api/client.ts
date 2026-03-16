import type { OverallAnalysisSummary } from "../model/types";

export async function fetchOverallAnalysisSummary(
  companyId: string,
  startDate: string,
  endDate: string,
  signal?: AbortSignal
): Promise<OverallAnalysisSummary | null> {
  const params = new URLSearchParams({
    companyId,
    startDate,
    endDate,
  });

  const res = await fetch(`/api/overall-analysis?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  if (!res.ok) {
    console.error("fetchOverallAnalysisSummary error", res.status, await res.text());
    throw new Error("全体分析データの取得に失敗しました");
  }

  const data = (await res.json()) as OverallAnalysisSummary | null;

  return data;
}
