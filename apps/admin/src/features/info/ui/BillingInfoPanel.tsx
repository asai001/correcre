"use client";

import type { CompanyBillingRow } from "@correcre/lib/company-billing";
import { BILLING_PAYMENT_DUE_DAY } from "@correcre/lib/company-billing";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@correcre/ui";

type BillingInfoPanelProps = {
  rows: CompanyBillingRow[];
};

function formatYen(value: number) {
  return `¥${value.toLocaleString("ja-JP")}`;
}

function formatMonthLabel(month: string) {
  const [year, mon] = month.split("-");
  return `${year}年${Number(mon)}月分`;
}

function formatDate(value: string) {
  return value.replace(/-/g, "/");
}

function BillingStatusBadge({ row }: { row: CompanyBillingRow }) {
  if (!row.billable) {
    return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">請求なし</span>;
  }

  if (!row.finalized) {
    return <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">見込み</span>;
  }

  return <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">確定</span>;
}

export default function BillingInfoPanel({ rows }: BillingInfoPanelProps) {
  const current = rows.find((row) => !row.finalized) ?? null;
  const hasEstimatedRow = rows.some((row) => row.source === "estimated");

  return (
    <div className="space-y-6">
      {current ? (
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 px-6 py-5">
            <div className="text-sm font-semibold text-cyan-800">{formatMonthLabel(current.month)}のご利用料金（見込み）</div>
            <div className="mt-2 text-4xl font-bold text-slate-900">{formatYen(current.amountYen)}</div>
            {current.billable ? (
              <dl className="mt-4 space-y-1 text-sm text-slate-600">
                <div className="flex justify-between gap-4">
                  <dt>月額基本料</dt>
                  <dd className="font-semibold text-slate-800">{formatYen(current.monthlyBaseFee)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>
                    ID 料金（{formatYen(current.perEmployeeMonthlyFee)} × {current.activeEmployees} 人）
                  </dt>
                  <dd className="font-semibold text-slate-800">{formatYen(current.employeeFeeYen)}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-4 text-sm text-slate-600">現在、ご契約が無効のため請求は発生しません。</p>
            )}
          </div>
          <div className="grid gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <div className="text-sm font-medium text-slate-500">請求日（締め日）</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{formatDate(current.billingDate)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <div className="text-sm font-medium text-slate-500">お支払期限</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{formatDate(current.paymentDueDate)}</div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm leading-6 text-slate-600">
        <p>ご利用料金 ＝ 月額基本料 ＋ ID 料金（1 人あたりの月額単価 × 利用人数）です。</p>
        <p>
          利用人数は「有効」のユーザー数です。当月分は月末時点の内容で確定し、月末締め・翌月 {BILLING_PAYMENT_DUE_DAY}{" "}
          日払いでのご請求となります。
        </p>
      </div>

      {rows.length ? (
        <div className="rounded-2xl border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>請求対象月</TableHead>
                <TableHead className="text-right">利用人数</TableHead>
                <TableHead className="text-right">月額基本料</TableHead>
                <TableHead className="text-right">月額単価</TableHead>
                <TableHead className="text-right">請求金額</TableHead>
                <TableHead className="text-center">請求日</TableHead>
                <TableHead className="text-center">支払期限</TableHead>
                <TableHead className="text-center">状態</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.month}>
                  <TableCell className="font-medium text-slate-900">
                    {formatMonthLabel(row.month)}
                    {row.source === "estimated" ? <span className="ml-1 text-xs text-slate-400">※</span> : null}
                  </TableCell>
                  <TableCell className="text-right">{row.activeEmployees} 人</TableCell>
                  <TableCell className="text-right">{formatYen(row.monthlyBaseFee)}</TableCell>
                  <TableCell className="text-right">{formatYen(row.perEmployeeMonthlyFee)}</TableCell>
                  <TableCell className="text-right font-bold text-slate-900">{formatYen(row.amountYen)}</TableCell>
                  <TableCell className="text-center">{formatDate(row.billingDate)}</TableCell>
                  <TableCell className="text-center">{formatDate(row.paymentDueDate)}</TableCell>
                  <TableCell className="text-center">
                    <BillingStatusBadge row={row} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
          まだ請求対象の月はありません。
        </div>
      )}

      {hasEstimatedRow ? (
        <p className="text-xs text-slate-500">
          ※ 当時の記録が残っていない月は、現在のご契約内容から算出した参考値です。
        </p>
      ) : null}
    </div>
  );
}
