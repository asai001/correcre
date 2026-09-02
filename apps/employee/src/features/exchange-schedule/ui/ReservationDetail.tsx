"use client";

import { useState } from "react";
import { Button } from "@mui/material";

import EmployeePageHeader from "@employee/components/EmployeePageHeader";
import { getExchangeStatusBadge } from "@correcre/merchandise-public";

import type { EmployeeReservationView } from "../model/types";

type Props = {
  view: EmployeeReservationView;
  initialPointBalance: number;
};

/**
 * 予約が必要な商品（サロン等）の交換詳細。外部予約システム（ホットペッパービューティー等）の
 * 空き枠は本システムと同期できないため、予約先の案内と、店舗が申請と照合するための
 * 交換番号の提示だけを行う。承認メールを見失っても、ここを開けば同じ案内に辿り着ける。
 */
export default function ReservationDetail({ view, initialPointBalance }: Props) {
  const [copied, setCopied] = useState(false);

  const badge = getExchangeStatusBadge(view.status);
  const isApproved = view.status === "PREPARING" || view.status === "IN_PROGRESS";
  const isClosed =
    view.status === "REJECTED" || view.status === "CANCELED" || view.status === "CANCELLED";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(view.exchangeId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボードが使えない環境では、番号を選択してコピーしてもらう
    }
  };

  return (
    <div className="-mt-px pb-12">
      <EmployeePageHeader
        title="ご予約のご案内"
        showPointExchangeLink
        right={
          <p className="text-sm font-semibold text-slate-200 sm:text-base">
            <span className="mr-1 text-xs text-slate-300 sm:text-sm">保有ポイント：</span>
            {initialPointBalance.toLocaleString("ja-JP")}pt
          </p>
        }
      />

      <div className="container mx-auto max-w-2xl px-6 pt-8">
        <section className="rounded-2xl bg-white p-6 shadow-lg">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>

          <h1 className="mt-2 text-lg font-bold text-slate-900">{view.merchandiseName}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {view.merchantName ?? "提携企業"}・{view.usedPoint.toLocaleString("ja-JP")}pt 使用
          </p>

          {view.status === "REQUESTED" ? (
            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              交換申請は現在承認待ちです。承認されるとメールでお知らせしますので、承認後に以下の方法でご予約ください。
            </div>
          ) : null}

          {isApproved ? (
            <div className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-slate-700">
              交換申請は承認済みです。ご利用には予約が必要です。以下の方法でご予約ください。
            </div>
          ) : null}

          {view.status === "COMPLETED" ? (
            <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              この交換は完了しています。ご利用ありがとうございました。
            </div>
          ) : null}

          {isClosed ? (
            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              この交換は{view.status === "REJECTED" ? "却下" : "キャンセル"}されているため、ご予約いただけません。
            </div>
          ) : null}

          {!isClosed ? (
            <>
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold text-slate-500">交換番号（予約時に店舗へお伝えください）</div>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <span className="break-all font-mono text-base font-bold text-slate-900">
                    {view.exchangeId}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-blue-300"
                  >
                    {copied ? "コピーしました" : "コピー"}
                  </button>
                </div>
              </div>

              {view.reservationUrl ? (
                <Button
                  component="a"
                  href={view.reservationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="contained"
                  fullWidth
                  className="!mt-4 !rounded-full !py-3"
                >
                  予約ページを開く
                </Button>
              ) : null}

              {view.instructions ? (
                <div className="mt-4 rounded-2xl border border-slate-200 px-4 py-4">
                  <h2 className="text-sm font-bold text-slate-900">予約方法・注意事項</h2>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                    {view.instructions}
                  </p>
                </div>
              ) : null}

              <div className="mt-4 rounded-2xl border-2 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                ご予約の際は、予約サイトの備考欄への記入、またはお電話・ご来店時に、上記の交換番号を必ずお伝えください。店舗が交換申請とご予約を照合するために使用します。
              </div>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
