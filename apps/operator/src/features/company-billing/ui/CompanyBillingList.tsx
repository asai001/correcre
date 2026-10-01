"use client";

import { Fragment, useMemo, useState } from "react";

import { BILLING_PAYMENT_DUE_DAY, type CompanyBillingRow } from "@correcre/lib/company-billing";
import { statusOptions } from "@correcre/lib/company-management-form";

import AdminPageHeader from "@operator/components/AdminPageHeader";

import type { CompanyBillingListData, CompanyBillingListItem } from "../model/types";

type Props = {
  data: CompanyBillingListData;
  operatorName: string;
};

type MonthlyBillingItem = {
  company: CompanyBillingListItem;
  row: CompanyBillingRow;
};

function formatYen(value: number) {
  return `¥${value.toLocaleString("ja-JP")}`;
}

function formatMonthLabel(month: string) {
  const [year, mon] = month.split("-");
  return `${year}年${Number(mon)}月`;
}

function formatDate(value: string) {
  return value.replace(/-/g, "/");
}

function getStatusLabel(status: CompanyBillingRow["status"]) {
  return statusOptions.find((option) => option.value === status)?.label ?? status;
}

function BillingStatusBadge({ row }: { row: CompanyBillingRow }) {
  if (!row.billable) {
    return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">請求なし</span>;
  }

  if (!row.finalized) {
    return <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">見込み</span>;
  }

  return <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">確定</span>;
}

function SourceNote({ row }: { row: CompanyBillingRow }) {
  if (row.source !== "estimated") {
    return null;
  }

  return (
    <span className="ml-1 text-xs text-slate-400" title="当時の記録がないため現在の設定値で算出">
      ※
    </span>
  );
}

export default function CompanyBillingList({ data, operatorName }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(data.currentMonth);
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);

  const monthlyItems = useMemo<MonthlyBillingItem[]>(
    () =>
      data.companies
        .flatMap((company) => {
          const row = company.rows.find((item) => item.month === selectedMonth);
          return row ? [{ company, row }] : [];
        })
        .sort(
          (left, right) =>
            Number(right.row.billable) - Number(left.row.billable) ||
            right.row.amountYen - left.row.amountYen ||
            left.company.companyName.localeCompare(right.company.companyName, "ja"),
        ),
    [data.companies, selectedMonth],
  );

  const billableItems = monthlyItems.filter((item) => item.row.billable);
  const totalAmountYen = billableItems.reduce((sum, item) => sum + item.row.amountYen, 0);
  const isCurrentMonth = selectedMonth === data.currentMonth;
  const hasEstimatedRow = data.companies.some((company) => company.rows.some((row) => row.source === "estimated"));
  // 請求日・支払期限は全社共通のルールで決まるため、表示中のどの行から取っても同じ。
  const scheduleRow = monthlyItems[0]?.row ?? null;

  const toggleCompany = (companyId: string) => {
    setExpandedCompanyId((current) => (current === companyId ? null : companyId));
  };

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        title="請求管理"
        adminName={operatorName}
        subtitle="導入企業ごとの月額利用料（請求金額・請求日・請求対象月）と請求履歴を確認します"
      />

      <section className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          請求対象月
          <select
            value={selectedMonth}
            onChange={(event) => {
              setSelectedMonth(event.target.value);
              setExpandedCompanyId(null);
            }}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700"
          >
            {data.months.map((month) => (
              <option key={month} value={month}>
                {formatMonthLabel(month)}
                {month === data.currentMonth ? "（当月）" : ""}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-slate-500">
          請求金額 ＝ 月額基本料 ＋ 利用人数（有効ユーザー） × 月額単価。月末締め・翌月 {BILLING_PAYMENT_DUE_DAY} 日払い。
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="text-sm font-semibold text-slate-500">
            請求金額合計{isCurrentMonth ? "（見込み）" : ""}
          </div>
          <div className="mt-3 text-3xl font-bold text-sky-600">{formatYen(totalAmountYen)}</div>
        </div>
        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="text-sm font-semibold text-slate-500">請求対象企業</div>
          <div className="mt-3 text-3xl font-bold text-slate-900">
            {billableItems.length}
            <span className="ml-1 text-base font-medium text-slate-500">社</span>
          </div>
        </div>
        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="text-sm font-semibold text-slate-500">請求日（締め日）</div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            {scheduleRow ? formatDate(scheduleRow.billingDate) : "—"}
          </div>
        </div>
        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="text-sm font-semibold text-slate-500">支払期限</div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            {scheduleRow ? formatDate(scheduleRow.paymentDueDate) : "—"}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <h2 className="text-lg font-bold text-slate-900">{formatMonthLabel(selectedMonth)}分の請求一覧</h2>
        <p className="mt-1 text-xs text-slate-500">
          企業名をクリックすると、その企業の請求履歴を表示します。
          {isCurrentMonth ? "当月分は月末まで利用人数や設定の変更に応じて変動します。" : ""}
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4 font-semibold">企業</th>
                <th className="py-2 pr-4 font-semibold">プラン</th>
                <th className="py-2 pr-4 text-right font-semibold">利用人数</th>
                <th className="py-2 pr-4 text-right font-semibold">月額基本料</th>
                <th className="py-2 pr-4 text-right font-semibold">月額単価</th>
                <th className="py-2 pr-4 text-right font-semibold">請求金額</th>
                <th className="py-2 text-center font-semibold">状態</th>
              </tr>
            </thead>
            <tbody>
              {monthlyItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-slate-400">
                    対象の企業がありません。
                  </td>
                </tr>
              ) : (
                monthlyItems.map(({ company, row }) => {
                  const expanded = expandedCompanyId === company.companyId;

                  return (
                    <Fragment key={company.companyId}>
                      <tr className="border-b border-slate-100 last:border-b-0">
                        <td className="py-2 pr-4 font-semibold text-slate-700">
                          <button
                            type="button"
                            onClick={() => toggleCompany(company.companyId)}
                            aria-expanded={expanded}
                            className="inline-flex items-center gap-1.5 text-left"
                          >
                            <span aria-hidden className="text-[10px] text-slate-400">
                              {expanded ? "▼" : "▶"}
                            </span>
                            {company.companyName}
                            <SourceNote row={row} />
                          </button>
                        </td>
                        <td className="py-2 pr-4 text-slate-700">{company.plan}</td>
                        <td className="py-2 pr-4 text-right text-slate-700">
                          {row.activeEmployees.toLocaleString("ja-JP")}名
                        </td>
                        <td className="py-2 pr-4 text-right text-slate-700">{formatYen(row.monthlyBaseFee)}</td>
                        <td className="py-2 pr-4 text-right text-slate-700">{formatYen(row.perEmployeeMonthlyFee)}</td>
                        <td className="py-2 pr-4 text-right font-bold text-sky-700">{formatYen(row.amountYen)}</td>
                        <td className="py-2 text-center">
                          <BillingStatusBadge row={row} />
                          {!row.billable ? (
                            <div className="mt-1 text-[11px] text-slate-400">{getStatusLabel(row.status)}</div>
                          ) : null}
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="border-b border-slate-100 last:border-b-0">
                          <td colSpan={7} className="bg-slate-50 px-4 py-3">
                            <div className="text-xs font-semibold text-slate-500">
                              {company.companyName} の請求履歴（現在のステータス: {getStatusLabel(company.status)}）
                            </div>
                            <table className="mt-2 w-full border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-slate-200 text-left text-slate-500">
                                  <th className="py-1.5 pr-4 font-semibold">請求対象月</th>
                                  <th className="py-1.5 pr-4 text-right font-semibold">利用人数</th>
                                  <th className="py-1.5 pr-4 text-right font-semibold">月額基本料</th>
                                  <th className="py-1.5 pr-4 text-right font-semibold">月額単価</th>
                                  <th className="py-1.5 pr-4 text-right font-semibold">請求金額</th>
                                  <th className="py-1.5 pr-4 text-center font-semibold">請求日</th>
                                  <th className="py-1.5 pr-4 text-center font-semibold">支払期限</th>
                                  <th className="py-1.5 text-center font-semibold">状態</th>
                                </tr>
                              </thead>
                              <tbody>
                                {company.rows.map((historyRow) => (
                                  <tr
                                    key={historyRow.month}
                                    className={`border-b border-slate-200/60 last:border-b-0 ${
                                      historyRow.month === selectedMonth ? "bg-sky-50/70" : ""
                                    }`}
                                  >
                                    <td className="py-1.5 pr-4 text-slate-700">
                                      {formatMonthLabel(historyRow.month)}
                                      <SourceNote row={historyRow} />
                                    </td>
                                    <td className="py-1.5 pr-4 text-right text-slate-700">
                                      {historyRow.activeEmployees.toLocaleString("ja-JP")}名
                                    </td>
                                    <td className="py-1.5 pr-4 text-right text-slate-700">
                                      {formatYen(historyRow.monthlyBaseFee)}
                                    </td>
                                    <td className="py-1.5 pr-4 text-right text-slate-700">
                                      {formatYen(historyRow.perEmployeeMonthlyFee)}
                                    </td>
                                    <td className="py-1.5 pr-4 text-right font-semibold text-sky-700">
                                      {formatYen(historyRow.amountYen)}
                                    </td>
                                    <td className="py-1.5 pr-4 text-center text-slate-700">
                                      {formatDate(historyRow.billingDate)}
                                    </td>
                                    <td className="py-1.5 pr-4 text-center text-slate-700">
                                      {formatDate(historyRow.paymentDueDate)}
                                    </td>
                                    <td className="py-1.5 text-center">
                                      <BillingStatusBadge row={historyRow} />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
            {billableItems.length > 0 ? (
              <tfoot>
                <tr className="border-t border-slate-200 font-bold text-slate-900">
                  <td className="py-2 pr-4" colSpan={5}>
                    合計
                  </td>
                  <td className="py-2 pr-4 text-right text-sky-700">{formatYen(totalAmountYen)}</td>
                  <td className="py-2" />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>

      <p className="text-xs text-slate-500">
        ※ 過去月はその月の最終時点の記録（月内に変更がなかった月は直前の記録）から算出しています。
        {hasEstimatedRow ? " 「※」の付いた月は当時の記録がないため、現在の設定値で算出した参考値です。" : ""}
        月額基本料・月額単価は「企業登録」の編集から変更できます。
      </p>
    </div>
  );
}
