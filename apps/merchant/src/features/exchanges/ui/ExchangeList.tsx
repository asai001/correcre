"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Alert, MenuItem, TextField } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight, faRightLeft } from "@fortawesome/free-solid-svg-icons";

import AdminPageHeader from "@merchant/components/AdminPageHeader";
import { getExchangeStatusBadge } from "@correcre/merchandise-public";

import { fetchExchanges } from "../api/client";
import type { ExchangeListFilter, ExchangeSummary } from "../model/types";

type Props = {
  initialItems: ExchangeSummary[];
  initialFilter: ExchangeListFilter;
  merchantName: string;
};

const FILTER_OPTIONS: ReadonlyArray<{ value: ExchangeListFilter; label: string }> = [
  { value: "ALL", label: "すべて" },
  { value: "REQUESTED", label: "申請中" },
  { value: "PREPARING", label: "準備中" },
  { value: "IN_PROGRESS", label: "対応中" },
  { value: "COMPLETED", label: "完了" },
  { value: "REJECTED", label: "却下" },
  { value: "CANCELED", label: "キャンセル" },
];

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPoint(value: number) {
  return `${value.toLocaleString("ja-JP")}pt`;
}

export default function ExchangeList({ initialItems, initialFilter, merchantName }: Props) {
  const [filter, setFilter] = useState<ExchangeListFilter>(initialFilter);
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const counts = useMemo(() => {
    const total = items.length;
    const requested = items.filter((item) => item.status === "REQUESTED").length;
    const inFlight = items.filter(
      (item) => item.status === "PREPARING" || item.status === "IN_PROGRESS",
    ).length;
    return { total, requested, inFlight };
  }, [items]);

  const handleFilterChange = (value: ExchangeListFilter) => {
    if (value === filter) return;
    setFilter(value);
    setError(null);

    startTransition(async () => {
      try {
        const next = await fetchExchanges(value);
        setItems(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : "交換一覧の取得に失敗しました。");
      }
    });
  };

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        title="交換管理"
        adminName={merchantName}
        subtitle="従業員からの交換申請の確認と状態更新"
        backHref="/dashboard"
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="text-sm font-semibold text-slate-500">対象件数</div>
          <div className="mt-3 text-3xl font-bold text-slate-900">{counts.total.toLocaleString("ja-JP")}</div>
          <div className="mt-1 text-xs text-slate-500">
            {filter === "ALL" ? "すべての交換" : `${FILTER_OPTIONS.find((entry) => entry.value === filter)?.label}`}
          </div>
        </div>
        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="text-sm font-semibold text-slate-500">申請中</div>
          <div className="mt-3 text-3xl font-bold text-amber-600">
            {counts.requested.toLocaleString("ja-JP")}
          </div>
          <div className="mt-1 text-xs text-slate-500">承認または却下を待っている件数（表示中の絞込内）</div>
        </div>
        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="text-sm font-semibold text-slate-500">準備中／対応中</div>
          <div className="mt-3 text-3xl font-bold text-indigo-600">
            {counts.inFlight.toLocaleString("ja-JP")}
          </div>
          <div className="mt-1 text-xs text-slate-500">作業を進める必要がある件数（表示中の絞込内）</div>
        </div>
      </section>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-slate-500">
          交換状態を更新すると従業員の履歴画面に反映されます。却下・キャンセル時はポイントが従業員に返却されます。
        </p>
        <TextField
          select
          size="small"
          label="状態で絞り込む"
          value={filter}
          onChange={(event) => handleFilterChange(event.target.value as ExchangeListFilter)}
          className="md:w-56"
          disabled={isPending}
        >
          {FILTER_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </div>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {items.length === 0 ? (
        <div className="rounded-[28px] bg-white p-10 text-center text-sm text-slate-500 shadow-lg shadow-slate-200/70">
          条件に一致する交換はまだありません。
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const badge = getExchangeStatusBadge(item.status);
            return (
              <li key={item.exchangeId}>
                <Link
                  href={`/exchanges/${encodeURIComponent(item.exchangeId)}`}
                  className="group flex flex-col gap-3 rounded-[24px] bg-white p-5 shadow-lg shadow-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-xl md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <FontAwesomeIcon icon={faRightLeft} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                        <span className="text-xs text-slate-500">申請日時: {formatDateTime(item.requestedAt ?? item.exchangedAt)}</span>
                      </div>
                      <div className="mt-2 text-base font-bold text-slate-900">{item.merchandiseName}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        申請者: {item.userName ?? item.userId} ／ ポイント: {formatPoint(item.usedPoint)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-semibold text-slate-700 transition group-hover:text-slate-900">
                    詳細を見る
                    <FontAwesomeIcon icon={faChevronRight} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
