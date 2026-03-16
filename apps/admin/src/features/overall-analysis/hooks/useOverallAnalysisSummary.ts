"use client";

import { useEffect, useState } from "react";
import { fetchOverallAnalysisSummary } from "../api/client";
import type { OverallAnalysisSummary } from "../model/types";

type UseOverallAnalysisSummaryResult = {
  summary: OverallAnalysisSummary | null;
  loading: boolean;
  error: string | null;
};

export function useOverallAnalysisSummary(
  companyId: string | undefined,
  startDate: string | undefined,
  endDate: string | undefined
): UseOverallAnalysisSummaryResult {
  const [summary, setSummary] = useState<OverallAnalysisSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !startDate || !endDate) {
      setSummary(null);
      setError(null);
      setLoading(false);
      return;
    }

    const ac = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchOverallAnalysisSummary(companyId, startDate, endDate, ac.signal);

        if (ac.signal.aborted) {
          return;
        }

        setSummary(data);
      } catch (err) {
        if (ac.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }

        console.error(err);
        setSummary(null);
        setError(err instanceof Error ? err.message : "全体分析データの取得に失敗しました");
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      ac.abort();
    };
  }, [companyId, startDate, endDate]);

  return { summary, loading, error };
}
