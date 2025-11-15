"use client";

import { useEffect, useState } from "react";
import type { DashboardSummary } from "../model/types";
import { fetchDashboardSummary } from "../api/client";

type UseDashboardSummaryOptions = {
  /** 初期ロードを抑制したい場合などに使う */
  enabled?: boolean;
};

export type UseDashboardSummaryResult = {
  summary: DashboardSummary | null;
  loading: boolean;
  error: string | null;
};

/**
 * ダッシュボード上部 3タイル用のサマリを取得するカスタムフック
 *
 * - companyId / userId が揃ったタイミングで自動ロード
 * - enabled=false ならロード抑制
 * - 依存が変わったら AbortController で古いリクエストをキャンセル
 */
export function useDashboardSummary(
  companyId: string | undefined,
  userId: string | undefined,
  targetYearMonth: string | undefined,
  options?: UseDashboardSummaryOptions
): UseDashboardSummaryResult {
  const { enabled = true } = options ?? {};

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // companyId / userId がまだ分からないとき or 明示的に無効化されているとき
    if (!enabled || !companyId || !userId || !targetYearMonth) {
      return;
    }

    const ac = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetchDashboardSummary(companyId, userId, targetYearMonth);

        if (ac.signal.aborted) {
          return;
        }

        setSummary(res);
      } catch (e) {
        if (ac.signal.aborted) {
          return;
        }

        console.error(e);
        setSummary(null);
        setError(e instanceof Error ? e.message : "予期せぬエラーが発生しました");
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    // cleanup：依存が変わったタイミングで古いリクエストを無効化
    return () => {
      ac.abort();
    };
  }, [companyId, userId, targetYearMonth, enabled]);

  return { summary, loading, error };
}
