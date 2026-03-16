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
    throw new Error("\u500b\u5225\u5206\u6790\u30c7\u30fc\u30bf\u306e\u53d6\u5f97\u306b\u5931\u6557\u3057\u307e\u3057\u305f");
  }

  const data = (await res.json()) as IndividualAnalysisSummary | null;

  return data;
}
