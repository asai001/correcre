"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowUpRightFromSquare,
  faChartColumn,
  faStore,
} from "@fortawesome/free-solid-svg-icons";

import AdminPageHeader from "@operator/components/AdminPageHeader";
import type { MerchantSummaryDetail } from "../model/types";

type MerchantSummaryViewProps = {
  summary: MerchantSummaryDetail;
  operatorName: string;
};

const STATUS_LABELS: Record<MerchantSummaryDetail["status"], string> = {
  PENDING: "申請中",
  ACTIVE: "登録済",
  INACTIVE: "停止中",
  REJECTED: "却下済",
};

function formatYen(value: number) {
  return `¥${value.toLocaleString("ja-JP")}`;
}

function formatCount(value: number) {
  return value.toLocaleString("ja-JP");
}

function formatMonthLabel(month: string) {
  const [year, mon] = month.split("-");
  return `${year}年${Number(mon)}月`;
}

export default function MerchantSummaryView({ summary, operatorName }: MerchantSummaryViewProps) {
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const toggleBreakdown = (month: string) => {
    setExpandedMonth((prev) => (prev === month ? null : month));
  };

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        title={`${summary.merchantName} のサマリー`}
        adminName={operatorName}
        backHref="/merchants"
        subtitle="商品・交換実績と月ごとの収支を確認します"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/merchants" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
          <FontAwesomeIcon icon={faArrowLeft} />
          提携企業一覧へ戻る
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/merchants/${encodeURIComponent(summary.merchantId)}/merchandise`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
          >
            登録商品
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
          </Link>
          <Link
            href={`/merchants/${encodeURIComponent(summary.merchantId)}/users`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
          >
            ユーザー招待
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
          </Link>
        </div>
      </div>

      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faStore} className="text-emerald-600" />
          <h2 className="text-xl font-bold text-slate-900">{summary.merchantName}</h2>
        </div>
        <div className="mt-1 text-xs text-slate-500">
          merchantId: {summary.merchantId} ／ 状態: {STATUS_LABELS[summary.status]} ／ 交換手数料率:{" "}
          {summary.exchangeFeePercent}%
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 xl:grid-cols-7">
          <div className="rounded-2xl bg-slate-50 px-3 py-2">
            <dt className="text-[11px] font-semibold text-slate-500">公開済み商品</dt>
            <dd className="mt-0.5 text-lg font-bold text-emerald-600">
              {formatCount(summary.stats.publishedCount)}
            </dd>
          </div>
          <div className="rounded-2xl bg-slate-50 px-3 py-2">
            <dt className="text-[11px] font-semibold text-slate-500">非公開商品</dt>
            <dd className="mt-0.5 text-lg font-bold text-amber-600">
              {formatCount(summary.stats.unpublishedCount)}
            </dd>
          </div>
          <div className="rounded-2xl bg-slate-50 px-3 py-2">
            <dt className="text-[11px] font-semibold text-slate-500">対応中の商品</dt>
            <dd className="mt-0.5 text-lg font-bold text-indigo-600">
              {formatCount(summary.stats.inProgressCount)}
            </dd>
          </div>
          <div className="rounded-2xl bg-slate-50 px-3 py-2">
            <dt className="text-[11px] font-semibold text-slate-500">累計交換数</dt>
            <dd className="mt-0.5 text-lg font-bold text-slate-900">
              {formatCount(summary.stats.totalExchangeCount)}
            </dd>
          </div>
          <div className="rounded-2xl bg-slate-50 px-3 py-2">
            <dt className="text-[11px] font-semibold text-slate-500">累計発生金額</dt>
            <dd className="mt-0.5 text-lg font-bold text-slate-900">
              {formatYen(summary.stats.totalAmountYen)}
            </dd>
          </div>
          <div className="rounded-2xl bg-slate-50 px-3 py-2">
            <dt className="text-[11px] font-semibold text-slate-500">累計手数料</dt>
            <dd className="mt-0.5 text-lg font-bold text-emerald-700">
              {formatYen(summary.stats.totalExchangeFeeYen)}
            </dd>
          </div>
          <div className="rounded-2xl bg-slate-50 px-3 py-2">
            <dt className="text-[11px] font-semibold text-slate-500">累計支払額</dt>
            <dd className="mt-0.5 text-lg font-bold text-rose-700">
              {formatYen(summary.stats.totalPayableYen)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faChartColumn} className="text-sky-600" />
          <h2 className="text-xl font-bold text-slate-900">月ごとの収支（直近12か月）</h2>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          手数料 ＝ 売上（交換相当額） × 交換手数料率（{summary.exchangeFeePercent}%・端数切り捨て）。
          支払額 ＝ 売上 − 手数料（提携企業からの請求額と同じ金額です）。
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4 font-semibold">月</th>
                <th className="py-2 pr-4 text-right font-semibold">交換件数</th>
                <th className="py-2 pr-4 text-right font-semibold">売上</th>
                <th className="py-2 pr-4 text-right font-semibold">手数料（{summary.exchangeFeePercent}%）</th>
                <th className="py-2 text-right font-semibold">支払額</th>
              </tr>
            </thead>
            <tbody>
              {summary.monthly.map((row) => (
                <Fragment key={row.month}>
                  <tr className="border-b border-slate-100 last:border-b-0">
                    <td className="py-2 pr-4 font-semibold text-slate-700">
                      <button
                        type="button"
                        onClick={() => toggleBreakdown(row.month)}
                        disabled={row.items.length === 0}
                        aria-expanded={expandedMonth === row.month}
                        className="inline-flex items-center gap-1.5 disabled:cursor-default"
                      >
                        <span
                          aria-hidden
                          className={`text-[10px] text-slate-400 ${row.items.length === 0 ? "invisible" : ""}`}
                        >
                          {expandedMonth === row.month ? "▼" : "▶"}
                        </span>
                        {formatMonthLabel(row.month)}
                      </button>
                    </td>
                    <td className="py-2 pr-4 text-right text-slate-700">
                      {formatCount(row.exchangeCount)}件
                    </td>
                    <td className="py-2 pr-4 text-right text-sky-700">{formatYen(row.salesYen)}</td>
                    <td className="py-2 pr-4 text-right text-emerald-700">{formatYen(row.exchangeFeeYen)}</td>
                    <td className="py-2 text-right font-bold text-rose-700">{formatYen(row.payableYen)}</td>
                  </tr>
                  {expandedMonth === row.month && row.items.length > 0 ? (
                    <tr className="border-b border-slate-100 last:border-b-0">
                      <td colSpan={5} className="bg-slate-50 px-4 py-3">
                        <div className="text-xs font-semibold text-slate-500">
                          {formatMonthLabel(row.month)}の商品・サービス別内訳
                        </div>
                        <table className="mt-2 w-full border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-left text-slate-500">
                              <th className="py-1.5 pr-4 font-semibold">商品・サービス</th>
                              <th className="py-1.5 pr-4 text-right font-semibold">交換件数</th>
                              <th className="py-1.5 text-right font-semibold">売上</th>
                            </tr>
                          </thead>
                          <tbody>
                            {row.items.map((item) => (
                              <tr key={item.merchandiseId} className="border-b border-slate-200/60 last:border-b-0">
                                <td className="py-1.5 pr-4 text-slate-700">{item.merchandiseName}</td>
                                <td className="py-1.5 pr-4 text-right text-slate-700">
                                  {formatCount(item.exchangeCount)}件
                                </td>
                                <td className="py-1.5 text-right font-semibold text-sky-700">{formatYen(item.salesYen)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
