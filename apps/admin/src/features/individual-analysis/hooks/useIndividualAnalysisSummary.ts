"use client";

import { useEffect, useState } from "react";
import { fetchIndividualAnalysisSummary } from "../api/client";
import type { IndividualAnalysisSummary } from "../model/types";

type UseIndividualAnalysisSummaryResult = {
  summary: IndividualAnalysisSummary | null;
  loading: boolean;
  error: string | null;
};

export function useIndividualAnalysisSummary(
  companyId: string | undefined,
  userId: string | undefined,
  startDate: string | undefined,
  endDate: string | undefined
): UseIndividualAnalysisSummaryResult {
  const [summary, setSummary] = useState<IndividualAnalysisSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !userId || !startDate || !endDate) {
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
        const data = await fetchIndividualAnalysisSummary(companyId, userId, startDate, endDate, ac.signal);

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
        setError(
          err instanceof Error ? err.message : "\u500b\u5225\u5206\u6790\u30c7\u30fc\u30bf\u306e\u53d6\u5f97\u306b\u5931\u6557\u3057\u307e\u3057\u305f"
        );
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      ac.abort();
    };
  }, [companyId, userId, startDate, endDate]);

  return { summary, loading, error };
}
