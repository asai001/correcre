import Link from "next/link";

import { getExchangeStatusBadge } from "@correcre/merchandise-public";

import type { DashboardData } from "../api/server";

type Props = {
  data: DashboardData;
};

function formatNumber(value: number) {
  return value.toLocaleString("ja-JP");
}

function formatPercent(ratio: number) {
  return `${Math.round(ratio * 1000) / 10}%`;
}

function formatDateTime(iso: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function DashboardCards({ data }: Props) {
  const { kpi, recentExchanges } = data;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="text-sm font-semibold text-slate-500">公開中の商品数</div>
          <div className="mt-4 text-4xl font-bold text-slate-900">{formatNumber(kpi.publishedMerchandiseCount)}</div>
          <div className="mt-2 text-xs text-slate-500">
            下書き {formatNumber(kpi.draftMerchandiseCount)} 件 / 非公開 {formatNumber(kpi.unpublishedMerchandiseCount)} 件
          </div>
        </div>
        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="text-sm font-semibold text-slate-500">当月の交換申請数</div>
          <div className="mt-4 text-4xl font-bold text-slate-900">{formatNumber(kpi.monthlyExchangeCount)}</div>
          <div className="mt-2 text-xs text-slate-500">
            完了 {formatNumber(kpi.monthlyCompletedCount)} 件 / 完了率 {formatPercent(kpi.monthlyCompletionRate)}
          </div>
        </div>
        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="text-sm font-semibold text-slate-500">対応待ち</div>
          <div className="mt-4 text-4xl font-bold text-amber-600">{formatNumber(kpi.pendingExchangeCount)}</div>
          <div className="mt-2 text-xs text-slate-500">「申請中」状態の交換件数です。</div>
        </div>
        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="text-sm font-semibold text-slate-500">対応中</div>
          <div className="mt-4 text-4xl font-bold text-indigo-600">{formatNumber(kpi.inProgressExchangeCount)}</div>
          <div className="mt-2 text-xs text-slate-500">「準備中」「対応中」の合計件数です。</div>
        </div>
      </section>

      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">直近の交換申請</h2>
          <Link
            href="/exchanges"
            className="text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            すべて見る →
          </Link>
        </div>
        {recentExchanges.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">まだ交換申請はありません。</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {recentExchanges.map((item) => {
              const badge = getExchangeStatusBadge(item.status);
              return (
                <li key={item.exchangeId} className="flex items-center gap-3 py-3">
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-900">{item.merchandiseName}</div>
                    <div className="text-xs text-slate-500">
                      {formatDateTime(item.exchangedAt)} ・ {formatNumber(item.usedPoint)}pt
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
