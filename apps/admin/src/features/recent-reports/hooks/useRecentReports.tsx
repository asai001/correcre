"use client";

import { useEffect, useState } from "react";
import type { RecentReport } from "../model/types";
import { fetchRecentReports } from "../api/client";

type UseRecentReportsOptions = {
  enabled?: boolean;
  limit?: number;
  userId?: string;
};

type UseRecentReportsResult = {
  reports: RecentReport[];
  loading: boolean;
  error: string | null;
};

export function useRecentReports(companyId: string | undefined, options?: UseRecentReportsOptions): UseRecentReportsResult {
  const { enabled = true, limit = 5, userId } = options ?? {};

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
        const data = await fetchRecentReports(companyId, limit, userId);

        if (ac.signal.aborted) {
          return;
        }

        setReports(data);
      } catch (err) {
        console.error(err);
        if (ac.signal.aborted) {
          return;
        }
        setError("直近の報告内容の取得に失敗しました");
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      ac.abort();
    };
  }, [companyId, enabled, limit, userId]);

  return { reports, loading, error };
}
