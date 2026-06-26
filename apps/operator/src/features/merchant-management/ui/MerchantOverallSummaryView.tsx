"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowUpRightFromSquare,
  faBuilding,
  faChartColumn,
  faCoins,
  faStore,
} from "@fortawesome/free-solid-svg-icons";

import AdminPageHeader from "@operator/components/AdminPageHeader";
import type { MerchantOverallSummary, MerchantSummaryDetail } from "../model/types";

type Props = {
  summary: MerchantOverallSummary;
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

function MetricCard({
  label,
  value,
  help,
  tone = "text-slate-900",
}: {
  label: string;
  value: string;
  help?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
      <div className="text-sm font-semibold text-slate-500">{label}</div>
      <div className={`mt-3 text-3xl font-bold ${tone}`}>{value}</div>
      {help ? <div className="mt-2 text-xs leading-5 text-slate-500">{help}</div> : null}
    </div>
  );
}

export default function MerchantOverallSummaryView({ summary, operatorName }: Props) {
  const { stats } = summary;
  const currentMonth = summary.monthly[0];
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const merchantsByAmount = [...summary.merchants].sort(
    (left, right) => right.stats.totalAmountYen - left.stats.totalAmountYen,
  );

  const toggleBreakdown = (month: string) => {
    setExpandedMonth((prev) => (prev === month ? null : month));
  };

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        title="提携企業サマリー"
        adminName={operatorName}
        backHref="/merchants"
        subtitle="提携企業全体の商品・交換実績と月ごとの収支"
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="登録済み提携企業"
          value={`${formatCount(stats.registeredMerchantCount)}社`}
          help={`稼働中 ${formatCount(stats.activeMerchantCount)}社 ／ 停止中 ${formatCount(stats.inactiveMerchantCount)}社 ／ 却下済 ${formatCount(stats.rejectedMerchantCount)}社`}
          tone="text-slate-900"
        />
        <MetricCard
          label="承認待ち申請"
          value={`${formatCount(stats.pendingMerchantCount)}件`}
          help="提携企業アプリからの自己登録申請です。"
          tone="text-amber-600"
        />
        <MetricCard
          label="公開済み商品"
          value={`${formatCount(stats.publishedCount)}件`}
          help={`非公開・下書き ${formatCount(stats.unpublishedCount)}件`}
          tone="text-emerald-600"
        />
        <MetricCard
          label="対応中の商品"
          value={`${formatCount(stats.inProgressCount)}件`}
          help="準備中・対応中の交換依頼です。"
          tone="text-indigo-600"
        />
        <MetricCard
          label="累計交換数"
          value={`${formatCount(stats.totalExchangeCount)}件`}
          help="却下・キャンセルを除く成立済み交換です。"
        />
        <MetricCard
          label="累計発生金額"
          value={formatYen(stats.totalAmountYen)}
          help="交換ポイントを円換算した金額です。"
          tone="text-sky-700"
        />
        <MetricCard
          label="累計手数料"
          value={formatYen(stats.totalExchangeFeeYen)}
          help="運用者側の交換手数料収入です。"
          tone="text-emerald-700"
        />
        <MetricCard
          label="累計支払額"
          value={formatYen(stats.totalPayableYen)}
          help="提携企業への支払額の累計です。"
          tone="text-rose-700"
        />
      </section>

      {currentMonth ? (
        <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faCoins} className="text-amber-600" />
            <h2 className="text-xl font-bold text-slate-900">今月の全体収支</h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {formatMonthLabel(currentMonth.month)} の成立済み交換を集計しています。
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 px-3 py-2">
              <dt className="text-[11px] font-semibold text-slate-500">交換件数</dt>
              <dd className="mt-0.5 text-lg font-bold text-slate-900">
                {formatCount(currentMonth.exchangeCount)}件
              </dd>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-2">
              <dt className="text-[11px] font-semibold text-slate-500">売上</dt>
              <dd className="mt-0.5 text-lg font-bold text-sky-700">{formatYen(currentMonth.salesYen)}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-2">
              <dt className="text-[11px] font-semibold text-slate-500">手数料</dt>
              <dd className="mt-0.5 text-lg font-bold text-emerald-700">
                {formatYen(currentMonth.exchangeFeeYen)}
              </dd>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-2">
              <dt className="text-[11px] font-semibold text-slate-500">支払額</dt>
              <dd className="mt-0.5 text-lg font-bold text-rose-700">{formatYen(currentMonth.payableYen)}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faChartColumn} className="text-sky-600" />
          <h2 className="text-xl font-bold text-slate-900">月ごとの全体収支（直近12か月）</h2>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          手数料率が企業ごとに異なる場合は、各企業の手数料を計算した後に月ごとへ合算しています。
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4 font-semibold">月</th>
                <th className="py-2 pr-4 text-right font-semibold">交換件数</th>
                <th className="py-2 pr-4 text-right font-semibold">売上</th>
                <th className="py-2 pr-4 text-right font-semibold">手数料</th>
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
                              <th className="py-1.5 pr-4 font-semibold">提携企業 / 商品・サービス</th>
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

      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faBuilding} className="text-emerald-600" />
          <h2 className="text-xl font-bold text-slate-900">企業別概況</h2>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          累計発生金額が大きい順に表示しています。詳細は各企業のサマリー画面で確認できます。
        </p>

        {merchantsByAmount.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">まだ提携企業は登録されていません。</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-4 font-semibold">提携企業</th>
                  <th className="py-2 pr-4 font-semibold">状態</th>
                  <th className="py-2 pr-4 text-right font-semibold">公開/非公開商品</th>
                  <th className="py-2 pr-4 text-right font-semibold">交換数</th>
                  <th className="py-2 pr-4 text-right font-semibold">発生金額</th>
                  <th className="py-2 pr-4 text-right font-semibold">手数料</th>
                  <th className="py-2 pr-4 text-right font-semibold">支払額</th>
                  <th className="py-2 text-right font-semibold">詳細</th>
                </tr>
              </thead>
              <tbody>
                {merchantsByAmount.map((merchant) => (
                  <tr key={merchant.merchantId} className="border-b border-slate-100 last:border-b-0">
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-slate-900">{merchant.merchantName}</div>
                      <div className="text-xs text-slate-500">merchantId: {merchant.merchantId}</div>
                    </td>
                    <td className="py-3 pr-4 text-slate-700">{STATUS_LABELS[merchant.status]}</td>
                    <td className="py-3 pr-4 text-right text-slate-700">
                      {formatCount(merchant.stats.publishedCount)} / {formatCount(merchant.stats.unpublishedCount)}
                    </td>
                    <td className="py-3 pr-4 text-right text-slate-700">
                      {formatCount(merchant.stats.totalExchangeCount)}件
                    </td>
                    <td className="py-3 pr-4 text-right text-sky-700">
                      {formatYen(merchant.stats.totalAmountYen)}
                    </td>
                    <td className="py-3 pr-4 text-right text-emerald-700">
                      {formatYen(merchant.stats.totalExchangeFeeYen)}
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold text-rose-700">
                      {formatYen(merchant.stats.totalPayableYen)}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/merchants/${encodeURIComponent(merchant.merchantId)}/summary`}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
                      >
                        <FontAwesomeIcon icon={faStore} />
                        サマリー
                        <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
