"use client";

import { useEffect, useState } from "react";
import type { RecentReport } from "../model/types";
import { fetchRecentReports } from "../api/client";

type UseRecentReportsOptions = {
  /** 初期ロードを抑制したい場合などに使う */
  enabled?: boolean;
  /** 取得する件数 */
  limit?: number;
};

type UseRecentReportsResult = {
  reports: RecentReport[];
  loading: boolean;
  error: string | null;
};

export function useRecentReports(companyId: string | undefined, options?: UseRecentReportsOptions): UseRecentReportsResult {
  const { enabled = true, limit = 5 } = options ?? {};

  const [reports, setReports] = useState<RecentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // companyId がまだ分からないとき or 明示的に無効化されているとき
    if (!enabled || !companyId) {
      return;
    }

    const ac = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchRecentReports(companyId, limit);

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
  }, [companyId, enabled, limit]);

  return { reports, loading, error };
}
