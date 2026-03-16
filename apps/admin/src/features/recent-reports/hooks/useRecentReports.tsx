"use client";

import { useEffect, useState } from "react";
import type { RecentReport } from "../model/types";
import { fetchRecentReports } from "../api/client";

type UseRecentReportsOptions = {
  enabled?: boolean;
  limit?: number;
  userId?: string;
  startDate?: string;
  endDate?: string;
};

type UseRecentReportsResult = {
  reports: RecentReport[];
  loading: boolean;
  error: string | null;
};

export function useRecentReports(companyId: string | undefined, options?: UseRecentReportsOptions): UseRecentReportsResult {
  const { enabled = true, limit = 5, userId, startDate, endDate } = options ?? {};

  const [reports, setReports] = useState<RecentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !companyId) {
      setReports([]);
      setError(null);
      setLoading(false);
      return;
    }

    const ac = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchRecentReports(companyId, limit, userId, startDate, endDate, ac.signal);

        if (ac.signal.aborted) {
          return;
        }

        setReports(data);
      } catch (err) {
        if (ac.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }

        console.error(err);
        setError("\u5831\u544a\u5185\u5bb9\u306e\u53d6\u5f97\u306b\u5931\u6557\u3057\u307e\u3057\u305f");
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      ac.abort();
    };
  }, [companyId, enabled, limit, userId, startDate, endDate]);

  return { reports, loading, error };
}
