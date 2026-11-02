"use client";

import Link from "next/link";

import type { CompanyBillingRow } from "@correcre/lib/company-billing";
import { BILLING_PAYMENT_DUE_DAY } from "@correcre/lib/company-billing";
import { canIssueCompanyInvoice } from "@correcre/lib/company-invoice";
import {
  COMPANY_POINT_RETURN_START_MONTH,
  type CompanyBillingRowWithPointReturn,
} from "@correcre/lib/company-point-return";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@correcre/ui";

type BillingInfoPanelProps = {
  rows: CompanyBillingRowWithPointReturn[];
  pointUnitLabel: string;
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

// その月に従業員へ付与されなかった分のうち、会社ポイントへ戻した量。
function PointReturnCell({ row, pointUnitLabel }: { row: CompanyBillingRowWithPointReturn; pointUnitLabel: string }) {
  const { pointReturn } = row;

  if (pointReturn.status === "returned") {
    const { record } = pointReturn;
    return (
      <div title={`ID料金分 ${record.releasedPoints.toLocaleString("ja-JP")}${pointUnitLabel} − 従業員の獲得 ${record.earnedPoints.toLocaleString("ja-JP")}${pointUnitLabel}`}>
        <div className="font-semibold text-emerald-700">
          +{record.returnedPoints.toLocaleString("ja-JP")}
          {pointUnitLabel}
        </div>
        <div className="text-[11px] text-slate-400">
          {record.releasedPoints.toLocaleString("ja-JP")} − {record.earnedPoints.toLocaleString("ja-JP")}
          {pointUnitLabel}
        </div>
      </div>
    );
  }

  if (pointReturn.status === "pending" && row.billable) {
    return <span className="text-xs text-slate-400">{row.finalized ? "集計中" : "翌月 1 日に確定"}</span>;
  }

  return <span className="text-xs text-slate-400">-</span>;
}

export default function BillingInfoPanel({ rows, pointUnitLabel }: BillingInfoPanelProps) {
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
                    ID料金 × 利用人数（{formatYen(current.perEmployeeMonthlyFee)} × {current.billableEmployees} 人）
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
        <p>ご利用料金 ＝ 月額基本料 ＋ ID料金（1 人あたりの月額料金） × 利用人数です。</p>
        <p>
          利用人数は、従業員のうち「有効」と「招待中」のユーザー数です（従業員ロールのない管理者は含みません）。当月分は月末時点の内容で確定し、月末締め・翌月 {BILLING_PAYMENT_DUE_DAY}{" "}
          日払いでのご請求となります。
        </p>
        <p>請求書は、金額が確定した月（前月以前）から表示・ダウンロードできます。</p>
        <p>
          会社への還元：ID料金分のポイントのうち、その月に従業員が獲得しなかった分を翌月 1 日に会社ポイントとして戻します（
          {formatMonthLabel(COMPANY_POINT_RETURN_START_MONTH)}から）。戻したポイントは「ユーザー管理」から従業員へ付与できます。
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
                <TableHead className="text-right">ID料金</TableHead>
                <TableHead className="text-right">請求金額</TableHead>
                <TableHead className="text-right">会社への還元</TableHead>
                <TableHead className="text-center">請求日</TableHead>
                <TableHead className="text-center">支払期限</TableHead>
                <TableHead className="text-center">状態</TableHead>
                <TableHead className="text-center">請求書</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.month}>
                  <TableCell className="font-medium text-slate-900">
                    {formatMonthLabel(row.month)}
                    {row.source === "estimated" ? <span className="ml-1 text-xs text-slate-400">※</span> : null}
                  </TableCell>
                  <TableCell className="text-right">{row.billableEmployees} 人</TableCell>
                  <TableCell className="text-right">{formatYen(row.monthlyBaseFee)}</TableCell>
                  <TableCell className="text-right">{formatYen(row.perEmployeeMonthlyFee)}</TableCell>
                  <TableCell className="text-right font-bold text-slate-900">{formatYen(row.amountYen)}</TableCell>
                  <TableCell className="text-right">
                    <PointReturnCell row={row} pointUnitLabel={pointUnitLabel} />
                  </TableCell>
                  <TableCell className="text-center">{formatDate(row.billingDate)}</TableCell>
                  <TableCell className="text-center">{formatDate(row.paymentDueDate)}</TableCell>
                  <TableCell className="text-center">
                    <BillingStatusBadge row={row} />
                  </TableCell>
                  <TableCell className="text-center">
                    {canIssueCompanyInvoice(row) ? (
                      <Link
                        href={`/info/invoice/${row.month}`}
                        target="_blank"
                        className="text-xs font-semibold text-cyan-700 underline"
                      >
                        表示・ダウンロード
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
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
