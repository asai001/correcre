import type { DashboardSummary } from "../model/types";

/**
 * ダッシュボード用の 3タイル分のサマリ情報を取得する
 *
 * 将来的には companyId + userId をキーに
 * - User テーブル（currentPointBalance, currentMonthCompletionRate）
 * - UserMonthlyStats テーブル（lastMonthEarnedPoints）
 * をまとめて返すイメージ。
 */
export async function fetchDashboardSummary(companyId: string, userId: string, targetYearMonth: string): Promise<DashboardSummary | null> {
  const params = new URLSearchParams({ companyId, userId, targetYearMonth }).toString();

  const res = await fetch(`/api/dashboard-summary?${params}`, {
    method: "GET",
    // ダッシュボードは「常に最新」が欲しいので no-store にしておく
    cache: "no-store",
  });

  console.log("res", res);

  if (!res.ok) {
    // ここで 404/500 を見て適宜ハンドリング
    console.error("fetchDashboardSummary error", res.status, await res.text());
    throw new Error("ダッシュボード情報の取得に失敗しました");
  }

  const data = (await res.json()) as DashboardSummary | null;

  return data;
}
