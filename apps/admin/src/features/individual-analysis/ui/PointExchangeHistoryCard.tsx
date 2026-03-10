"use client";

import { useEffect, useState } from "react";

type PointExchangeHistoryItem = {
  date: string;
  merchandiseName: string;
  usedPoint: number;
};

type PointExchangeHistoryCardProps = {
  companyId: string;
  userId: string;
  limit?: number;
};

async function fetchPointExchangeHistory(
  companyId: string,
  userId: string,
  limit: number,
  signal: AbortSignal
): Promise<PointExchangeHistoryItem[]> {
  const params = new URLSearchParams({
    companyId,
    userId,
    limit: String(limit),
  });

  const res = await fetch(`/api/exchange-history?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  if (!res.ok) {
    console.error("fetchPointExchangeHistory error", res.status, await res.text());
    throw new Error("ポイント交換履歴の取得に失敗しました");
  }

  const data = (await res.json()) as PointExchangeHistoryItem[] | null;

  return data ?? [];
}

export default function PointExchangeHistoryCard({
  companyId,
  userId,
  limit = 3,
}: PointExchangeHistoryCardProps) {
  const [items, setItems] = useState<PointExchangeHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchPointExchangeHistory(companyId, userId, limit, ac.signal);

        if (ac.signal.aborted) {
          return;
        }

        setItems(data);
      } catch (err) {
        console.error(err);

        if (ac.signal.aborted) {
          return;
        }

        setError("ポイント交換履歴の取得に失敗しました");
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      ac.abort();
    };
  }, [companyId, userId, limit]);

  return (
    <section className="min-h-[320px] rounded-2xl bg-white p-6 shadow-lg">
      <h3 className="text-lg font-bold text-slate-900">ポイント交換履歴</h3>

      <div className="mt-8">
        {loading && <div className="text-sm text-slate-400">読み込み中...</div>}

        {!loading && error && <div className="text-sm text-red-500">{error}</div>}

        {!loading && !error && items.length === 0 && (
          <div className="flex min-h-[220px] items-center justify-center text-sm text-slate-400">交換履歴はありません</div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={`${item.date}-${item.merchandiseName}-${index}`}
                className="border-b border-slate-200 pb-4 last:border-b-0 last:pb-0"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-slate-900">{item.merchandiseName}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.date}</p>
                  </div>

                  <div className="shrink-0 sm:text-right">
                    <p className="text-lg font-semibold text-red-500">-{item.usedPoint.toLocaleString()}pt</p>
                    <p className="mt-1 text-sm font-medium text-emerald-500">完了</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
