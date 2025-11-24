"use client";

import { useEffect, useState } from "react";
import type { AvgItemCompletionItem } from "../model/types";
import { fetchAvgItemCompletion } from "../api/client";

type UseAvgItemCompletionOptions = {
  /** 初期ロードを抑制したい場合などに使う */
  enabled?: boolean;
};

type UseAvgItemCompletionResult = {
  labels: string[];
  data: number[];
  loading: boolean;
  error: string | null;
};

export function useAvgItemCompletion(
  companyId: string | undefined,
  thisYearMonth: string,
  options?: UseAvgItemCompletionOptions
): UseAvgItemCompletionResult {
  const { enabled = true } = options ?? {};

  const [items, setItems] = useState<AvgItemCompletionItem[]>([]);
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
        const data = await fetchAvgItemCompletion(companyId, thisYearMonth);

        if (ac.signal.aborted) {
          return;
        }

        setItems(data);
      } catch (err) {
        console.error(err);
        if (ac.signal.aborted) {
          return;
        }
        setError("項目ごとの平均達成割合の取得に失敗しました");
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      ac.abort();
    };
  }, [companyId, thisYearMonth, enabled]);

  const labels = items.map((i) => i.title);
  const data = items.map((i) => i.completionRate);

  return { labels, data, loading, error };
}
