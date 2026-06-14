"use client";

import { Fragment, useState } from "react";

import AdminPageHeader from "@merchant/components/AdminPageHeader";

import { sendInvoiceEmail } from "../api/client";
import type { SettlementData } from "../model/types";

type Props = {
  data: SettlementData;
  merchantUserName: string;
};

type Feedback = {
  type: "success" | "error";
  text: string;
};

function formatYen(value: number) {
  return `¥${Math.round(value).toLocaleString("ja-JP")}`;
}

function formatMonthLabel(month: string) {
  const [year, mon] = month.split("-");
  return `${year}年${Number(mon)}月`;
}

export default function SettlementView({ data, merchantUserName }: Props) {
  const [sendingMonth, setSendingMonth] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const current = data.current;
  const feePercentLabel = `${data.exchangeFeePercent}%`;

  const toggleBreakdown = (month: string) => {
    setExpandedMonth((prev) => (prev === month ? null : month));
  };

  const handleSendInvoice = async (month: string) => {
    const confirmed = window.confirm(
      `${formatMonthLabel(month)}分の請求メールを運用者に送信します。よろしいですか？`,
    );
    if (!confirmed) {
      return;
    }

    setSendingMonth(month);
    setFeedback(null);
    try {
      await sendInvoiceEmail(month);
      setFeedback({
        type: "success",
        text: `${formatMonthLabel(month)}分の請求メールを運用者に送信しました。`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "請求メールの送信に失敗しました。",
      });
    } finally {
      setSendingMonth(null);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        title="収支・精算"
        adminName={merchantUserName}
        subtitle="交換実績にもとづく売上と、運用者への請求額を確認できます"
        backHref="/dashboard"
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="text-sm font-semibold text-slate-500">当月の売上（{formatMonthLabel(current.month)}）</div>
          <div className="mt-3 text-3xl font-bold text-sky-600">{formatYen(current.salesYen)}</div>
          <div className="mt-1 text-xs text-slate-500">交換されたポイントの金額換算（{current.exchangeCount.toLocaleString("ja-JP")}件）</div>
        </div>
        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="text-sm font-semibold text-slate-500">交換手数料（{feePercentLabel}）</div>
          <div className="mt-3 text-3xl font-bold text-rose-600">{formatYen(current.exchangeFeeYen)}</div>
          <div className="mt-1 text-xs text-slate-500">売上 × {feePercentLabel}（端数切り捨て）</div>
        </div>
        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="text-sm font-semibold text-slate-500">当月のご請求額</div>
          <div className="mt-3 text-3xl font-bold text-emerald-600">{formatYen(current.invoiceYen)}</div>
          <div className="mt-1 text-xs text-slate-500">売上 − 交換手数料</div>
        </div>
      </section>

      {feedback ? (
        <p
          role="status"
          className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.text}
        </p>
      ) : null}

      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <h2 className="text-lg font-bold text-slate-900">月ごとの収支</h2>
        <p className="mt-1 text-xs text-slate-500">
          却下・キャンセルを除く交換を集計しています。月をクリックすると商品・サービス別の内訳を表示します。
          「請求メールを送信」を押すと、該当月の請求内容が運用者にメールで通知されます。
          請求は月単位のため、当月分は月が締まった翌月以降に送信できます。
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4 font-semibold">月</th>
                <th className="py-2 pr-4 text-right font-semibold">交換件数</th>
                <th className="py-2 pr-4 text-right font-semibold">売上</th>
                <th className="py-2 pr-4 text-right font-semibold">手数料（{feePercentLabel}）</th>
                <th className="py-2 pr-4 text-right font-semibold">請求額</th>
                <th className="py-2 text-right font-semibold">操作</th>
              </tr>
            </thead>
            <tbody>
              {data.months.map((row) => (
                <Fragment key={row.month}>
                  <tr className="border-b border-slate-100 last:border-b-0">
                    <td className="py-2 pr-4 font-semibold text-slate-700">
                      <button
                        type="button"
                        onClick={() => toggleBreakdown(row.month)}
                        disabled={row.exchangeCount === 0}
                        aria-expanded={expandedMonth === row.month}
                        className="inline-flex items-center gap-1.5 disabled:cursor-default"
                      >
                        <span
                          aria-hidden
                          className={`text-[10px] text-slate-400 ${row.exchangeCount === 0 ? "invisible" : ""}`}
                        >
                          {expandedMonth === row.month ? "▼" : "▶"}
                        </span>
                        {formatMonthLabel(row.month)}
                      </button>
                    </td>
                    <td className="py-2 pr-4 text-right text-slate-700">{row.exchangeCount.toLocaleString("ja-JP")}件</td>
                    <td className="py-2 pr-4 text-right text-sky-700">{formatYen(row.salesYen)}</td>
                    <td className="py-2 pr-4 text-right text-rose-700">{formatYen(row.exchangeFeeYen)}</td>
                    <td className="py-2 pr-4 text-right font-bold text-emerald-700">{formatYen(row.invoiceYen)}</td>
                    <td className="py-2 text-right">
                      {row.month === current.month ? (
                        <span className="text-xs font-semibold text-slate-400">締め前のため送信不可</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSendInvoice(row.month)}
                          disabled={row.salesYen <= 0 || sendingMonth !== null}
                          className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          {sendingMonth === row.month ? "送信中…" : "請求メールを送信"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedMonth === row.month && row.items.length > 0 ? (
                    <tr className="border-b border-slate-100 last:border-b-0">
                      <td colSpan={6} className="bg-slate-50 px-4 py-3">
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
                                  {item.exchangeCount.toLocaleString("ja-JP")}件
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
