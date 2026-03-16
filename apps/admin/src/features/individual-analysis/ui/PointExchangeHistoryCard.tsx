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
  startDate: string;
  endDate: string;
  limit?: number;
};

async function fetchPointExchangeHistory(
  companyId: string,
  userId: string,
  startDate: string,
  endDate: string,
  limit: number,
  signal: AbortSignal
): Promise<PointExchangeHistoryItem[]> {
  const params = new URLSearchParams({
    companyId,
    userId,
    startDate,
    endDate,
    limit: String(limit),
  });

  const res = await fetch(`/api/exchange-history?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  if (!res.ok) {
    console.error("fetchPointExchangeHistory error", res.status, await res.text());
    throw new Error("\u30dd\u30a4\u30f3\u30c8\u4ea4\u63db\u5c65\u6b74\u306e\u53d6\u5f97\u306b\u5931\u6557\u3057\u307e\u3057\u305f");
  }

  const data = (await res.json()) as PointExchangeHistoryItem[] | null;

  return data ?? [];
}

export default function PointExchangeHistoryCard({
  companyId,
  userId,
  startDate,
  endDate,
  limit = 3,
}: PointExchangeHistoryCardProps) {
  const [items, setItems] = useState<PointExchangeHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !userId || !startDate || !endDate) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }

    const ac = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchPointExchangeHistory(companyId, userId, startDate, endDate, limit, ac.signal);

        if (ac.signal.aborted) {
          return;
        }

        setItems(data);
      } catch (err) {
        if (ac.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }

        console.error(err);
        setError("\u30dd\u30a4\u30f3\u30c8\u4ea4\u63db\u5c65\u6b74\u306e\u53d6\u5f97\u306b\u5931\u6557\u3057\u307e\u3057\u305f");
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      ac.abort();
    };
  }, [companyId, userId, startDate, endDate, limit]);

  return (
    <section className="min-h-[320px] rounded-2xl bg-white p-6 shadow-lg">
      <h3 className="text-lg font-bold text-slate-900">{"\u30dd\u30a4\u30f3\u30c8\u4ea4\u63db\u5c65\u6b74"}</h3>

      <div className="mt-8">
        {loading && <div className="text-sm text-slate-400">{"\u8aad\u307f\u8fbc\u307f\u4e2d\u002e\u002e\u002e"}</div>}

        {!loading && error && <div className="text-sm text-red-500">{error}</div>}

        {!loading && !error && items.length === 0 && (
          <div className="flex min-h-[220px] items-center justify-center text-sm text-slate-400">
            {"\u6307\u5b9a\u671f\u9593\u306e\u4ea4\u63db\u5c65\u6b74\u306f\u3042\u308a\u307e\u305b\u3093"}
          </div>
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
                    <p className="mt-1 text-sm font-medium text-emerald-500">{"\u4ea4\u63db\u6e08\u307f"}</p>
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
