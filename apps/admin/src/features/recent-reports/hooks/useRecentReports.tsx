"use client";

import { useEffect, useState } from "react";
import type { RecentReport } from "../model/types";
import { fetchRecentReports } from "../api/client";

type UseRecentReportsOptions = {
  enabled?: boolean;
  limit?: number;
  fetchAll?: boolean;
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
  const { enabled = true, limit = 5, fetchAll = false, userId, startDate, endDate } = options ?? {};

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
        const data = await fetchRecentReports(companyId, fetchAll ? undefined : limit, userId, startDate, endDate, ac.signal);

        if (ac.signal.aborted) {
          return;
        }

        setReports(data);
      } catch (err) {
        if (ac.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }

        console.error(err);
        setError("報告内容の取得に失敗しました");
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      ac.abort();
    };
  }, [companyId, enabled, fetchAll, limit, userId, startDate, endDate]);

  return { reports, loading, error };
}
