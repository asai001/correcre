"use client";

import { Fragment, useState } from "react";

import AdminPageHeader from "@operator/components/AdminPageHeader";

import type { CompanyIncomeRow, FinanceDashboardData, MerchantExpenseRow } from "../model/types";

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

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric" }).format(date);
}

// 内訳の 1 行。クリックで中身を開閉する。
function ToggleRow({
  label,
  amount,
  amountClassName,
  open,
  onToggle,
  children,
}: {
  label: string;
  amount: string;
  amountClassName: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <li className="border-b border-slate-200/60 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-1.5 text-left"
      >
        <span className="inline-flex items-center gap-1.5 text-slate-700">
          <span aria-hidden className="text-[10px] text-slate-400">
            {open ? "▼" : "▶"}
          </span>
          {label}
        </span>
        <span className={`font-semibold ${amountClassName}`}>{amount}</span>
      </button>
      {open ? <div className="mb-2 ml-4 rounded-lg bg-white px-3 py-2">{children}</div> : null}
    </li>
  );
}

function useToggleSet() {
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set());
  const toggle = (key: string) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  return { isOpen: (key: string) => openKeys.has(key), toggle };
}

// 収入の内訳：導入企業ごとに、月額基本料と ID料金 × 人数を開いて見られる。
function IncomeBreakdown({ rows }: { rows: CompanyIncomeRow[] }) {
  const { isOpen, toggle } = useToggleSet();

  if (rows.length === 0) {
    return <p className="mt-2 text-xs text-slate-400">対象の企業がありません。</p>;
  }

  return (
    <ul className="mt-2 text-xs">
      {rows.map((company) => (
        <ToggleRow
          key={company.companyId}
          label={company.companyName}
          amount={formatYen(company.monthlyIncomeYen)}
          amountClassName="text-sky-700"
          open={isOpen(company.companyId)}
          onToggle={() => toggle(company.companyId)}
        >
          <dl className="space-y-1 text-slate-600">
            <div className="flex justify-between gap-4">
              <dt>月額基本料</dt>
              <dd>{formatYen(company.monthlyBaseFee)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>
                ID料金（{formatYen(company.perEmployeeMonthlyFee)} × {company.activeEmployees.toLocaleString("ja-JP")}人）
              </dt>
              <dd>{formatYen(company.perEmployeeMonthlyFee * company.activeEmployees)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-slate-200 pt-1 font-semibold text-slate-800">
              <dt>合計</dt>
              <dd>{formatYen(company.monthlyIncomeYen)}</dd>
            </div>
          </dl>
        </ToggleRow>
      ))}
    </ul>
  );
}

// 支出の内訳：提携企業ごとに、その月に完了した交換の明細と支払額の計算を開いて見られる。
function ExpenseBreakdown({ merchants, month }: { merchants: MerchantExpenseRow[]; month: string }) {
  const { isOpen, toggle } = useToggleSet();

  if (merchants.length === 0) {
    return <p className="mt-2 text-xs text-slate-400">この月の支出はありません。</p>;
  }

  return (
    <ul className="mt-2 text-xs">
      {merchants.map((merchant) => {
        const settlement = merchant.byMonth[month];
        if (!settlement) return null;
        return (
          <ToggleRow
            key={merchant.merchantId}
            label={`${merchant.merchantName}（${settlement.exchanges.length}件）`}
            amount={formatYen(settlement.payableYen)}
            amountClassName="text-rose-700"
            open={isOpen(merchant.merchantId)}
            onToggle={() => toggle(merchant.merchantId)}
          >
            <table className="w-full border-collapse text-slate-600">
              <thead>
                <tr className="text-left text-slate-400">
                  <th className="py-1 pr-2 font-semibold">完了日</th>
                  <th className="py-1 pr-2 font-semibold">商品・サービス</th>
                  <th className="py-1 pr-2 font-semibold">申請者（所属）</th>
                  <th className="py-1 pr-2 text-right font-semibold">pt</th>
                  <th className="py-1 text-right font-semibold">交換相当額</th>
                </tr>
              </thead>
              <tbody>
                {settlement.exchanges.map((exchange) => (
                  <tr key={exchange.exchangeId} className="border-t border-slate-100">
                    <td className="py-1 pr-2 whitespace-nowrap">{formatDate(exchange.completedAt)}</td>
                    <td className="py-1 pr-2">{exchange.merchandiseName}</td>
                    <td className="py-1 pr-2">
                      {exchange.applicantName ?? "-"}
                      {exchange.companyName ? <span className="text-slate-400">（{exchange.companyName}）</span> : null}
                    </td>
                    <td className="py-1 pr-2 text-right">{exchange.usedPoint.toLocaleString("ja-JP")}</td>
                    <td className="py-1 text-right">{formatYen(exchange.amountYen)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="text-slate-700">
                <tr className="border-t border-slate-200">
                  <td colSpan={4} className="py-1 pr-2 text-right">売上（交換相当額の合計）</td>
                  <td className="py-1 text-right">{formatYen(settlement.salesYen)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="py-1 pr-2 text-right">
                    交換手数料（{merchant.exchangeFeePercent}%・端数切り捨て）
                  </td>
                  <td className="py-1 text-right text-emerald-700">− {formatYen(settlement.exchangeFeeYen)}</td>
                </tr>
                <tr className="font-semibold">
                  <td colSpan={4} className="py-1 pr-2 text-right">支払額</td>
                  <td className="py-1 text-right text-rose-700">{formatYen(settlement.payableYen)}</td>
                </tr>
              </tfoot>
            </table>
          </ToggleRow>
        );
      })}
    </ul>
  );
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
      const settlement = merchant.byMonth[settlementMonth];
      return {
        merchantId: merchant.merchantId,
        merchantName: merchant.merchantName,
        exchangeFeePercent: merchant.exchangeFeePercent,
        salesYen: settlement?.salesYen ?? 0,
        exchangeFeeYen: settlement?.exchangeFeeYen ?? 0,
        payableYen: settlement?.payableYen ?? 0,
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
  const pendingTotal = data.pendingMerchants.reduce(
    (sum, row) => ({
      count: sum.count + row.count,
      amountYen: sum.amountYen + row.amountYen,
      estimatedPayableYen: sum.estimatedPayableYen + row.estimatedPayableYen,
    }),
    { count: 0, amountYen: 0, estimatedPayableYen: 0 },
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
            <div className="mt-1 text-xs text-slate-500">導入企業の月額基本料 + 従業員数 × ID料金</div>
          </div>
          <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
            <div className="text-sm font-semibold text-slate-500">当月の支出（{formatMonthLabel(current.month)}）</div>
            <div className="mt-3 text-3xl font-bold text-rose-600">{formatYen(current.expenseYen)}</div>
            <div className="mt-1 text-xs text-slate-500">提携企業への支払額（交換相当額 − 交換手数料）</div>
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
        ※ 収入は「請求管理」と同じ計算（月次スナップショット優先。月内に変更がなかった月は直前のスナップショット、記録がない月は現在値で補完）です。企業作成前の月には収入を計上しません。
        支出は提携企業への支払額（交換相当額 − 交換手数料）で、提携企業側の請求額と同じ金額です。ステータスが「完了」になった交換を、完了した月に計上しています（申請中・対応中の交換は含みません）。
      </p>

      {/* 完了待ちの交換。確定した支出ではないため、月の収支には混ぜずに今後の支払予定として別枠で出す。 */}
      <section className="rounded-[28px] border-2 border-dashed border-slate-300 bg-slate-50 p-6">
        <h2 className="text-lg font-bold text-slate-700">支払予定（完了待ちの交換）</h2>
        <p className="mt-1 text-xs text-slate-500">
          申請中・準備中・対応中の交換です。完了した月の支出に計上されます。見込み支払額は今の手数料率で全件が完了した場合の金額で、却下・キャンセルや完了月の分かれ方によって変わります。
        </p>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <span className="text-sm font-semibold text-slate-500">
            {pendingTotal.count.toLocaleString("ja-JP")}件 ／ 交換相当額 {formatYen(pendingTotal.amountYen)}
          </span>
          <span className="text-2xl font-bold text-slate-600">見込み支払額 {formatYen(pendingTotal.estimatedPayableYen)}</span>
        </div>
        {data.pendingMerchants.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-4 font-semibold">提携企業</th>
                  <th className="py-2 pr-4 text-right font-semibold">件数</th>
                  <th className="py-2 pr-4 text-right font-semibold">交換相当額</th>
                  <th className="py-2 text-right font-semibold">見込み支払額</th>
                </tr>
              </thead>
              <tbody>
                {data.pendingMerchants.map((merchant) => (
                  <tr key={merchant.merchantId} className="border-b border-slate-100 last:border-b-0">
                    <td className="py-2 pr-4 font-semibold text-slate-700">{merchant.merchantName}</td>
                    <td className="py-2 pr-4 text-right text-slate-700">{merchant.count.toLocaleString("ja-JP")}件</td>
                    <td className="py-2 pr-4 text-right text-slate-700">{formatYen(merchant.amountYen)}</td>
                    <td className="py-2 text-right font-semibold text-slate-700">{formatYen(merchant.estimatedPayableYen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-400">完了待ちの交換はありません。</p>
        )}
      </section>

      {/* 月ごとの収支 */}
      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <h2 className="text-lg font-bold text-slate-900">月ごとの収支</h2>
        <p className="mt-1 text-xs text-slate-500">
          月をクリックすると、収入（導入企業ごと）と支出（提携企業ごと）の内訳を表示します。企業名をクリックすると、さらに中身（料金の内訳・交換の明細）を表示します。
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
                  .filter((merchant) => (merchant.byMonth[row.month]?.payableYen ?? 0) > 0)
                  .sort(
                    (left, right) =>
                      (right.byMonth[row.month]?.payableYen ?? 0) - (left.byMonth[row.month]?.payableYen ?? 0),
                  );

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
                              <IncomeBreakdown rows={data.companyIncomeByMonth[row.month] ?? []} />
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-slate-500">
                                支出の内訳（提携企業ごと）
                              </div>
                              <ExpenseBreakdown merchants={expenseBreakdown} month={row.month} />
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
                <th className="py-2 pr-4 text-right font-semibold">月額基本料</th>
                <th className="py-2 pr-4 text-right font-semibold">ID料金</th>
                <th className="py-2 text-right font-semibold">月間収入</th>
              </tr>
            </thead>
            <tbody>
              {selectedCompanyRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-400">
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
                    <td className="py-2 pr-4 text-right text-slate-700">{formatYen(company.monthlyBaseFee)}</td>
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
        <p className="mt-1 text-xs text-slate-500">提携企業への支払額（交換相当額 − 交換手数料）です。</p>
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
                        {merchant.byMonth[month] ? formatYen(merchant.byMonth[month].payableYen) : "—"}
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
