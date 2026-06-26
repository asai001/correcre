"use client";

import { Fragment, useState } from "react";

import { calculateExchangeFeeYen, calculateMerchantInvoiceYen } from "@correcre/lib/billing";

import AdminPageHeader from "@operator/components/AdminPageHeader";

import type { FinanceDashboardData } from "../model/types";

type Props = {
  data: FinanceDashboardData;
  operatorName: string;
};

function formatYen(value: number) {
  return `¥${Math.round(value).toLocaleString("ja-JP")}`;
}

function formatMonthLabel(month: string) {
  const [year, mon] = month.split("-");
  return `${year}年${Number(mon)}月`;
}

function balanceColor(value: number) {
  if (value > 0) return "text-emerald-600";
  if (value < 0) return "text-rose-600";
  return "text-slate-900";
}

export default function FinanceDashboard({ data, operatorName }: Props) {
  const current = data.monthly[data.monthly.length - 1];

  // 精算セクションの対象月（初期値は当月）。
  const [settlementMonth, setSettlementMonth] = useState(data.months[data.months.length - 1] ?? "");
  const [incomeMonth, setIncomeMonth] = useState(data.months[data.months.length - 1] ?? "");

  // 月ごとの収支テーブルで内訳を展開している月。
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const toggleMonthBreakdown = (month: string) => {
    setExpandedMonth((prev) => (prev === month ? null : month));
  };

  const settlementRows = data.merchants
    .map((merchant) => {
      const salesYen = merchant.byMonth[settlementMonth] ?? 0;
      return {
        merchantId: merchant.merchantId,
        merchantName: merchant.merchantName,
        exchangeFeePercent: merchant.exchangeFeePercent,
        salesYen,
        exchangeFeeYen: calculateExchangeFeeYen(salesYen, merchant.exchangeFeePercent),
        payableYen: calculateMerchantInvoiceYen(salesYen, merchant.exchangeFeePercent),
      };
    })
    .sort((left, right) => right.payableYen - left.payableYen);

  const settlementTotal = settlementRows.reduce(
    (sum, row) => ({
      salesYen: sum.salesYen + row.salesYen,
      exchangeFeeYen: sum.exchangeFeeYen + row.exchangeFeeYen,
      payableYen: sum.payableYen + row.payableYen,
    }),
    { salesYen: 0, exchangeFeeYen: 0, payableYen: 0 },
  );
  const selectedCompanyRows = data.companyIncomeByMonth[incomeMonth] ?? [];
  const selectedMonthlyIncomeYen = data.monthlyIncomeByMonth[incomeMonth] ?? 0;

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        title="収支ダッシュボード"
        adminName={operatorName}
        subtitle="導入企業からの収入と、商品・サービス交換による支出を集計します"
        backHref="/dashboard"
      />

      {current ? (
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
            <div className="text-sm font-semibold text-slate-500">当月の収入（{formatMonthLabel(current.month)}）</div>
            <div className="mt-3 text-3xl font-bold text-sky-600">{formatYen(current.incomeYen)}</div>
            <div className="mt-1 text-xs text-slate-500">導入企業の従業員数 × 月額単価</div>
          </div>
          <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
            <div className="text-sm font-semibold text-slate-500">当月の支出（{formatMonthLabel(current.month)}）</div>
            <div className="mt-3 text-3xl font-bold text-rose-600">{formatYen(current.expenseYen)}</div>
            <div className="mt-1 text-xs text-slate-500">交換されたポイント × {5}円</div>
          </div>
          <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
            <div className="text-sm font-semibold text-slate-500">当月の収支</div>
            <div className={`mt-3 text-3xl font-bold ${balanceColor(current.balanceYen)}`}>
              {formatYen(current.balanceYen)}
            </div>
            <div className="mt-1 text-xs text-slate-500">収入 − 支出</div>
          </div>
        </section>
      ) : null}

      <p className="text-xs text-slate-500">
        ※ 収入は会社レコードに保存された月次スナップショットを優先して算出します。スナップショットがない既存月は現在値を補完しますが、企業作成前の月には収入を計上しません。
        支出は各交換の申請月をもとに集計しています。
      </p>

      {/* 月ごとの収支 */}
      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <h2 className="text-lg font-bold text-slate-900">月ごとの収支</h2>
        <p className="mt-1 text-xs text-slate-500">
          月をクリックすると、収入（導入企業ごと）と支出（提携企業ごと）の内訳を表示します。
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4 font-semibold">月</th>
                <th className="py-2 pr-4 text-right font-semibold">収入</th>
                <th className="py-2 pr-4 text-right font-semibold">支出</th>
                <th className="py-2 text-right font-semibold">収支</th>
              </tr>
            </thead>
            <tbody>
              {[...data.monthly].reverse().map((row) => {
                const expenseBreakdown = data.merchants
                  .map((merchant) => ({
                    merchantId: merchant.merchantId,
                    merchantName: merchant.merchantName,
                    expenseYen: merchant.byMonth[row.month] ?? 0,
                  }))
                  .filter((item) => item.expenseYen > 0)
                  .sort((left, right) => right.expenseYen - left.expenseYen);

                return (
                  <Fragment key={row.month}>
                    <tr className="border-b border-slate-100 last:border-b-0">
                      <td className="py-2 pr-4 font-semibold text-slate-700">
                        <button
                          type="button"
                          onClick={() => toggleMonthBreakdown(row.month)}
                          aria-expanded={expandedMonth === row.month}
                          className="inline-flex items-center gap-1.5"
                        >
                          <span aria-hidden className="text-[10px] text-slate-400">
                            {expandedMonth === row.month ? "▼" : "▶"}
                          </span>
                          {formatMonthLabel(row.month)}
                        </button>
                      </td>
                      <td className="py-2 pr-4 text-right text-sky-700">{formatYen(row.incomeYen)}</td>
                      <td className="py-2 pr-4 text-right text-rose-700">{formatYen(row.expenseYen)}</td>
                      <td className={`py-2 text-right font-bold ${balanceColor(row.balanceYen)}`}>
                        {formatYen(row.balanceYen)}
                      </td>
                    </tr>
                    {expandedMonth === row.month ? (
                      <tr className="border-b border-slate-100 last:border-b-0">
                        <td colSpan={4} className="bg-slate-50 px-4 py-3">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <div className="text-xs font-semibold text-slate-500">
                                収入の内訳（導入企業ごと）
                              </div>
                              {(data.companyIncomeByMonth[row.month] ?? []).length === 0 ? (
                                <p className="mt-2 text-xs text-slate-400">対象の企業がありません。</p>
                              ) : (
                                <table className="mt-2 w-full border-collapse text-xs">
                                  <tbody>
                                    {(data.companyIncomeByMonth[row.month] ?? []).map((company) => (
                                      <tr
                                        key={company.companyId}
                                        className="border-b border-slate-200/60 last:border-b-0"
                                      >
                                        <td className="py-1.5 pr-4 text-slate-700">{company.companyName}</td>
                                        <td className="py-1.5 text-right font-semibold text-sky-700">
                                          {formatYen(company.monthlyIncomeYen)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-slate-500">
                                支出の内訳（提携企業ごと）
                              </div>
                              {expenseBreakdown.length === 0 ? (
                                <p className="mt-2 text-xs text-slate-400">この月の支出はありません。</p>
                              ) : (
                                <table className="mt-2 w-full border-collapse text-xs">
                                  <tbody>
                                    {expenseBreakdown.map((item) => (
                                      <tr
                                        key={item.merchantId}
                                        className="border-b border-slate-200/60 last:border-b-0"
                                      >
                                        <td className="py-1.5 pr-4 text-slate-700">{item.merchantName}</td>
                                        <td className="py-1.5 text-right font-semibold text-rose-700">
                                          {formatYen(item.expenseYen)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 導入企業ごとの収入 */}
      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">導入企業ごとの月間収入</h2>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            対象月
            <select
              value={incomeMonth}
              onChange={(event) => setIncomeMonth(event.target.value)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700"
            >
              {[...data.months].reverse().map((month) => (
                <option key={month} value={month}>
                  {formatMonthLabel(month)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-1 text-xs text-slate-500">企業作成前の月と、対象月時点で無効の企業は除外しています。</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4 font-semibold">企業</th>
                <th className="py-2 pr-4 text-right font-semibold">従業員数</th>
                <th className="py-2 pr-4 text-right font-semibold">月額単価</th>
                <th className="py-2 text-right font-semibold">月間収入</th>
              </tr>
            </thead>
            <tbody>
              {selectedCompanyRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-400">
                    対象の企業がありません。
                  </td>
                </tr>
              ) : (
                selectedCompanyRows.map((company) => (
                  <tr key={company.companyId} className="border-b border-slate-100 last:border-b-0">
                    <td className="py-2 pr-4 font-semibold text-slate-700">{company.companyName}</td>
                    <td className="py-2 pr-4 text-right text-slate-700">
                      {company.activeEmployees.toLocaleString("ja-JP")}名
                    </td>
                    <td className="py-2 pr-4 text-right text-slate-700">{formatYen(company.perEmployeeMonthlyFee)}</td>
                    <td className="py-2 text-right font-bold text-sky-700">{formatYen(company.monthlyIncomeYen)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {selectedCompanyRows.length > 0 ? (
              <tfoot>
                <tr className="border-t border-slate-200 font-bold text-slate-900">
                  <td className="py-2 pr-4">合計</td>
                  <td className="py-2 pr-4" />
                  <td className="py-2 pr-4" />
                  <td className="py-2 text-right text-sky-700">{formatYen(selectedMonthlyIncomeYen)}</td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>

      {/* 提携企業ごとの精算（支払額） */}
      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">提携企業ごとの精算（支払額）</h2>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            対象月
            <select
              value={settlementMonth}
              onChange={(event) => setSettlementMonth(event.target.value)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700"
            >
              {[...data.months].reverse().map((month) => (
                <option key={month} value={month}>
                  {formatMonthLabel(month)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          支払額 ＝ 売上（交換相当額） − 交換手数料（提携企業ごとの設定率・端数切り捨て）。提携企業側の画面に表示される請求額と同じ金額です。
          交換手数料率は提携企業管理の編集モーダルで設定できます。
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4 font-semibold">提携企業</th>
                <th className="py-2 pr-4 text-right font-semibold">売上</th>
                <th className="py-2 pr-4 text-right font-semibold">手数料率</th>
                <th className="py-2 pr-4 text-right font-semibold">手数料</th>
                <th className="py-2 text-right font-semibold">支払額</th>
              </tr>
            </thead>
            <tbody>
              {settlementRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-400">
                    対象の提携企業がありません。
                  </td>
                </tr>
              ) : (
                settlementRows.map((row) => (
                  <tr key={row.merchantId} className="border-b border-slate-100 last:border-b-0">
                    <td className="py-2 pr-4 font-semibold text-slate-700">{row.merchantName}</td>
                    <td className="py-2 pr-4 text-right text-sky-700">{formatYen(row.salesYen)}</td>
                    <td className="py-2 pr-4 text-right text-slate-700">{row.exchangeFeePercent}%</td>
                    <td className="py-2 pr-4 text-right text-emerald-700">{formatYen(row.exchangeFeeYen)}</td>
                    <td className="py-2 text-right font-bold text-rose-700">{formatYen(row.payableYen)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {settlementRows.length > 0 ? (
              <tfoot>
                <tr className="border-t border-slate-200 font-bold text-slate-900">
                  <td className="py-2 pr-4">合計</td>
                  <td className="py-2 pr-4 text-right text-sky-700">{formatYen(settlementTotal.salesYen)}</td>
                  <td className="py-2 pr-4" />
                  <td className="py-2 pr-4 text-right text-emerald-700">{formatYen(settlementTotal.exchangeFeeYen)}</td>
                  <td className="py-2 text-right text-rose-700">{formatYen(settlementTotal.payableYen)}</td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>

      {/* 提携企業ごと・月ごとの支出 */}
      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <h2 className="text-lg font-bold text-slate-900">提携企業ごと・月ごとの支出</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="sticky left-0 bg-white py-2 pr-4 font-semibold">提携企業</th>
                {data.months.map((month) => (
                  <th key={month} className="py-2 pr-4 text-right font-semibold whitespace-nowrap">
                    {formatMonthLabel(month)}
                  </th>
                ))}
                <th className="py-2 text-right font-semibold">累計</th>
              </tr>
            </thead>
            <tbody>
              {data.merchants.length === 0 ? (
                <tr>
                  <td colSpan={data.months.length + 2} className="py-4 text-center text-slate-400">
                    対象の提携企業がありません。
                  </td>
                </tr>
              ) : (
                data.merchants.map((merchant) => (
                  <tr key={merchant.merchantId} className="border-b border-slate-100 last:border-b-0">
                    <td className="sticky left-0 bg-white py-2 pr-4 font-semibold text-slate-700 whitespace-nowrap">
                      {merchant.merchantName}
                    </td>
                    {data.months.map((month) => (
                      <td key={month} className="py-2 pr-4 text-right text-slate-700">
                        {merchant.byMonth[month] ? formatYen(merchant.byMonth[month]) : "—"}
                      </td>
                    ))}
                    <td className="py-2 text-right font-bold text-rose-700">{formatYen(merchant.totalExpenseYen)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
