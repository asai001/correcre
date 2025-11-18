// 「いつ・どんな条件で データを取りに行くか」「loading / error の管理」をする層
"use client";

import { useEffect, useState } from "react";
import type { LoginInfo } from "../model/types";
import { fetchLoginInfo } from "../api/client";

type UseLoginInfoForDashboardOptions = {
  /** 初期ロードを抑制したい場合などに使う */
  enabled?: boolean;
};

type UseLoginInfoForDashboardResult = {
  data: LoginInfo | null;
  loading: boolean;
  error: string | null;
};

export function useLoginInfo(
  companyId: string | undefined,
  userId: string | undefined,
  options?: UseLoginInfoForDashboardOptions
): UseLoginInfoForDashboardResult {
  const { enabled = true } = options ?? {};

  const [data, setData] = useState<LoginInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // companyId / userId がまだ分からないとき or 明示的に無効化されているとき
    if (!enabled || !companyId || !userId) {
      return;
    }

    const ac = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetchLoginInfo(companyId, userId);

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
  }, [companyId, userId, enabled]);

  return { data, loading, error };
}
