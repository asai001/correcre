import type { MonthlyPointsHistoryItem } from "../model/types";

/**
 * ダッシュボード用の「過去24ヶ月の月間獲得ポイント推移」を取得
 */
export async function fetchMonthlyPointsHistory(companyId: string, userId: string, months = 24): Promise<MonthlyPointsHistoryItem[]> {
  const params = new URLSearchParams({
    companyId,
    userId,
    months: String(months),
  }).toString();

  const res = await fetch(`/api/monthly-points-history?${params}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("fetchMonthlyPointsHistory error", res.status, await res.text());
    throw new Error("月次ポイント履歴の取得に失敗しました");
  }

  const data = (await res.json()) as MonthlyPointsHistoryItem[] | null;

  return data ?? [];
}
