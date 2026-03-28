import type { IndividualAnalysisSummary } from "../model/types";

export async function fetchIndividualAnalysisSummary(
  companyId: string,
  userId: string,
  startDate: string,
  endDate: string,
  signal?: AbortSignal
): Promise<IndividualAnalysisSummary | null> {
  const params = new URLSearchParams({
    companyId,
    userId,
    startDate,
    endDate,
  });

  const res = await fetch(`/api/individual-analysis?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  if (!res.ok) {
    console.error("fetchIndividualAnalysisSummary error", res.status, await res.text());
    throw new Error("個別分析データの取得に失敗しました");
  }

  const data = (await res.json()) as IndividualAnalysisSummary | null;

  return data;
}
