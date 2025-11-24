import type { AvgItemCompletionItem } from "../model/types";

/**
 * ダッシュボード用の「項目ごとの平均達成割合（先月）」を取得
 */
export async function fetchAvgItemCompletion(companyId: string, thisYearMonth: string): Promise<AvgItemCompletionItem[]> {
  const params = new URLSearchParams({
    companyId,
    thisYearMonth,
  }).toString();

  const res = await fetch(`/api/avg-item-completion?${params}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("fetchAvgItemCompletion error", res.status, await res.text());
    throw new Error("項目ごとの平均達成割合の取得に失敗しました");
  }

  const data = (await res.json()) as AvgItemCompletionItem[] | null;

  return data ?? [];
}
