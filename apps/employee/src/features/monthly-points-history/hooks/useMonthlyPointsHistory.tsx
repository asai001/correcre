"use client";

import { useEffect, useState } from "react";
import { fetchMonthlyPointsHistory } from "../api/client";
import type { MonthlyPointsHistoryItem } from "../model/types";

type UseMonthlyPointsHistoryOptions = {
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

        setError("月次点数履歴の取得に失敗しました");
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

  const labels = items.map((item) => item.yearMonth);
  const data = items.map((item) => item.earnedScore);

  return { labels, data, loading, error };
}
