// 「いつ・どんな条件で データを取りに行くか」「loading / error の管理」をする層
"use client";

import { useEffect, useState } from "react";
import type { Philosophy } from "../model/types";
import { fetchPhilosophy } from "../api/client";

type UsePhilosophyForDashboardOptions = {
  /** 初期ロードを抑制したい場合などに使う */
  enabled?: boolean;
};

type UsePhilosophyForDashboardResult = {
  data: Philosophy | null;
  loading: boolean;
  error: string | null;
};

export function usePhilosophyForDashboard(
  companyId: string | undefined,
  options?: UsePhilosophyForDashboardOptions
): UsePhilosophyForDashboardResult {
  const { enabled = true } = options ?? {};

  const [data, setData] = useState<Philosophy | null>(null);
  const [loading, setLoading] = useState(false);
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
        const res = await fetchPhilosophy(companyId);

        if (ac.signal.aborted) {
          return;
        }

        setData(res);
      } catch (err) {
        if (ac.signal.aborted) {
          return;
        }
        console.error(err);
        setError("ユーザー情報の取得に失敗しました。");
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      ac.abort();
    };
  }, [companyId, enabled]);

  return { data, loading, error };
}
