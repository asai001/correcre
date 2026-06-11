"use client";

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
        ※ 収入は現在の従業員数・月額単価のスナップショットを各月に適用して算出しています（過去時点の従業員数は保持していません）。
        支出は各交換の申請月をもとに集計しています。
      </p>

      {/* 月ごとの収支 */}
      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <h2 className="text-lg font-bold text-slate-900">月ごとの収支</h2>
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
              {[...data.monthly].reverse().map((row) => (
                <tr key={row.month} className="border-b border-slate-100 last:border-b-0">
                  <td className="py-2 pr-4 font-semibold text-slate-700">{formatMonthLabel(row.month)}</td>
                  <td className="py-2 pr-4 text-right text-sky-700">{formatYen(row.incomeYen)}</td>
                  <td className="py-2 pr-4 text-right text-rose-700">{formatYen(row.expenseYen)}</td>
                  <td className={`py-2 text-right font-bold ${balanceColor(row.balanceYen)}`}>
                    {formatYen(row.balanceYen)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 導入企業ごとの収入 */}
      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <h2 className="text-lg font-bold text-slate-900">導入企業ごとの月間収入</h2>
        <p className="mt-1 text-xs text-slate-500">無効化された企業は除外しています。</p>
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
              {data.companies.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-400">
                    対象の企業がありません。
                  </td>
                </tr>
              ) : (
                data.companies.map((company) => (
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
            {data.companies.length > 0 ? (
              <tfoot>
                <tr className="border-t border-slate-200 font-bold text-slate-900">
                  <td className="py-2 pr-4">合計</td>
                  <td className="py-2 pr-4" />
                  <td className="py-2 pr-4" />
                  <td className="py-2 text-right text-sky-700">{formatYen(data.monthlyIncomeYen)}</td>
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
