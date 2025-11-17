"use client";

import { useEffect, useState } from "react";
import { MonthlyPointsHistoryItem } from "../model/types";
import { fetchMonthlyPointsHistory } from "../api/client";

type UseMonthlyPointsHistoryOptions = {
  /** 初期ロードを抑制したい場合などに使う */
  enabled?: boolean;
};

type UseMonthlyPointsHistoryResult = {
  labels: string[];
  data: number[];
  loading: boolean;
  error: string | null;
};

export function useMonthlyPointsHistory(
  companyId: string | undefined,
  userId: string | undefined,
  months: number | undefined,
  options?: UseMonthlyPointsHistoryOptions
): UseMonthlyPointsHistoryResult {
  const { enabled = true } = options ?? {};

  const [items, setItems] = useState<MonthlyPointsHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // companyId / userId がまだ分からないとき or 明示的に無効化されているとき
    if (!enabled || !companyId || !userId) {
      return;
    }

    const ac = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchMonthlyPointsHistory(companyId, userId, months);

        if (ac.signal.aborted) {
          return;
        }

        setItems(data);
      } catch (err) {
        console.error(err);
        if (ac.signal.aborted) {
          return;
        }
        setError("月次ポイント履歴の取得に失敗しました");
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      ac.abort();
    };
  }, [companyId, userId, months, enabled]);

  const labels = items.map((i) => i.yearMonth);
  const data = items.map((i) => i.earnedPoints);

  return { labels, data, loading, error };
}
