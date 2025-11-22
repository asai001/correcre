import type { AvgPointsTrendItem } from "../model/types";

/**
 * ダッシュボード用の「平均獲得点数推移」を取得
 */
export async function fetchAvgPointsTrend(companyId: string, months: number = 12): Promise<AvgPointsTrendItem[]> {
  const params = new URLSearchParams({
    companyId,
    months: String(months),
  }).toString();

  const res = await fetch(`/api/avg-points-trend?${params}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("fetchAvgPointsTrend error", res.status, await res.text());
    throw new Error("平均獲得点数の取得に失敗しました");
  }

  const data = (await res.json()) as AvgPointsTrendItem[] | null;

  return data ?? [];
}
