"use client";

import { useEffect, useState } from "react";
import type { AvgPointsTrendItem } from "../model/types";
import { fetchAvgPointsTrend } from "../api/client";

type UseAvgPointsTrendOptions = {
  /** 初期ロードを抑制したい場合などに使う */
  enabled?: boolean;
};

type UseAvgPointsTrendResult = {
  labels: string[];
  data: number[];
  loading: boolean;
  error: string | null;
};

export function useAvgPointsTrend(
  companyId: string | undefined,
  months: number = 12,
  options?: UseAvgPointsTrendOptions
): UseAvgPointsTrendResult {
  const { enabled = true } = options ?? {};

  const [items, setItems] = useState<AvgPointsTrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // companyId / userId がまだ分からないとき or 明示的に無効化されているとき
    if (!enabled || !companyId) {
      return;
    }

    const ac = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchAvgPointsTrend(companyId, months);

        if (ac.signal.aborted) {
          return;
        }

        setItems(data);
      } catch (err) {
        console.error(err);
        if (ac.signal.aborted) {
          return;
        }
        setError("平均獲得点数の取得に失敗しました");
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      ac.abort();
    };
  }, [companyId, months, enabled]);

  const labels = items.map((i) => i.yearMonth);
  const data = items.map((i) => i.avgEarnedScore);

  return { labels, data, loading, error };
}
