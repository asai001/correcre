"use client";

import { useEffect, useState } from "react";
import { fetchEmployeeManagementSummary } from "../api/client";
import type { EmployeeManagementSummary } from "../model/types";

type UseEmployeeManagementSummaryResult = {
  summary: EmployeeManagementSummary | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

export function useEmployeeManagementSummary(
  companyId: string | undefined,
  adminUserId?: string
): UseEmployeeManagementSummaryResult {
  const [summary, setSummary] = useState<EmployeeManagementSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!companyId) {
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
        const data = await fetchEmployeeManagementSummary(companyId, adminUserId, ac.signal);

        if (ac.signal.aborted) {
          return;
        }

        setSummary(data);
      } catch (err) {
        if (ac.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }

        console.error(err);
        setError("従業員管理データの取得に失敗しました");
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      ac.abort();
    };
  }, [adminUserId, companyId, reloadKey]);

  return {
    summary,
    loading,
    error,
    reload: () => setReloadKey((current) => current + 1),
  };
}
