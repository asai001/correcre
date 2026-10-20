"use client";

import Link from "next/link";

import type { CompanyInvoiceData } from "../model/types";

type Props = {
  data: CompanyInvoiceData;
};

function formatYen(value: number) {
  return `¥${value.toLocaleString("ja-JP")}`;
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function formatMonthLabel(month: string) {
  const [year, mon] = month.split("-");
  return `${year}年${Number(mon)}月`;
}

/**
 * 導入企業向けの請求書。A4 1 枚に収まるレイアウトで、ブラウザの印刷から「PDF に保存」して使う
 * （日本語フォントを埋め込んだ PDF をサーバーで生成するより、手元のフォントで確実に出力できるため）。
 */
export default function CompanyInvoiceView({ data }: Props) {
  const { invoice, issuer, recipient } = data;

  return (
    <div className="overflow-x-auto px-4 py-6 print:overflow-visible print:p-0">
      {/* 用紙の余白を 0 にして、ブラウザが余白に印字するヘッダー・フッター（日時・タイトル・URL・ページ番号）を
          出さないようにする。余白は請求書（article）の内側の padding で取る */}
      <style>{"@page { size: A4; margin: 0; }"}</style>

      <div className="mx-auto mb-4 flex w-[210mm] flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/info" className="text-sm font-semibold text-slate-600 underline">
          ← 請求情報に戻る
        </Link>
        <div className="flex items-center gap-3">
          <p className="text-xs text-slate-500">印刷画面で送信先を「PDF に保存」にするとダウンロードできます。</p>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            印刷 / PDF で保存
          </button>
        </div>
      </div>

      {/* プレビューも印刷と同じ A4（210 × 297mm）の紙で表示する */}
      <article className="mx-auto box-border min-h-[297mm] w-[210mm] bg-white px-[16mm] py-[18mm] text-[13px] leading-6 text-slate-900 shadow-lg print:m-0 print:min-h-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6">
          <h1 className="text-2xl font-bold tracking-[0.4em]">請求書</h1>
          <dl className="text-right text-xs leading-5">
            <div>
              <dt className="inline">請求書番号：</dt>
              <dd className="inline">{invoice.invoiceNumber}</dd>
            </div>
            <div>
              <dt className="inline">請求日：</dt>
              <dd className="inline">{formatDate(invoice.issueDate)}</dd>
            </div>
          </dl>
        </header>

        <section className="mt-8 flex flex-wrap items-start justify-between gap-8">
          <div className="min-w-[45%]">
            <p className="border-b border-slate-900 pb-1 text-lg font-bold">{recipient.companyName} 御中</p>
            {recipient.address ? <p className="mt-2 text-xs">{recipient.address}</p> : null}
            {recipient.contactName ? <p className="text-xs">ご担当：{recipient.contactName} 様</p> : null}
          </div>
          <div className="text-xs leading-5">
            <p className="text-sm font-bold">{issuer.companyName}</p>
            {issuer.postalCode ? <p>〒{issuer.postalCode}</p> : null}
            {issuer.address ? <p>{issuer.address}</p> : null}
            {issuer.phone ? <p>TEL：{issuer.phone}</p> : null}
            {issuer.email ? <p>{issuer.email}</p> : null}
            {issuer.registrationNumber ? <p>登録番号：{issuer.registrationNumber}</p> : null}
          </div>
        </section>

        <p className="mt-8">下記のとおりご請求申し上げます。</p>

        <section className="mt-3 flex flex-wrap items-end justify-between gap-4 border-y-2 border-slate-900 py-3">
          <div>
            <div className="text-xs text-slate-600">ご請求金額（税込）</div>
            <div className="text-3xl font-bold">{formatYen(invoice.totalYen)}</div>
          </div>
          <dl className="text-xs leading-5">
            <div>
              <dt className="inline">件名：</dt>
              <dd className="inline">コレクレ ご利用料金（{formatMonthLabel(invoice.month)}分）</dd>
            </div>
            <div>
              <dt className="inline">お支払期限：</dt>
              <dd className="inline font-semibold">{formatDate(invoice.paymentDueDate)}</dd>
            </div>
          </dl>
        </section>

        <table className="mt-6 w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 text-left">
              <th className="border border-slate-300 px-3 py-2 font-semibold">品目</th>
              <th className="border border-slate-300 px-3 py-2 text-right font-semibold">数量</th>
              <th className="border border-slate-300 px-3 py-2 text-right font-semibold">単価（税込）</th>
              <th className="border border-slate-300 px-3 py-2 text-right font-semibold">金額（税込）</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line) => (
              <tr key={line.label}>
                <td className="border border-slate-300 px-3 py-2">
                  {line.label}（{formatMonthLabel(invoice.month)}分）
                </td>
                <td className="border border-slate-300 px-3 py-2 text-right">
                  {line.quantity.toLocaleString("ja-JP")} {line.unit}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-right">{formatYen(line.unitPriceYen)}</td>
                <td className="border border-slate-300 px-3 py-2 text-right">{formatYen(line.amountYen)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="border border-slate-300 px-3 py-2 text-right font-semibold">
                合計（税込）
              </td>
              <td className="border border-slate-300 px-3 py-2 text-right font-bold">{formatYen(invoice.totalYen)}</td>
            </tr>
            <tr>
              <td colSpan={3} className="border border-slate-300 px-3 py-2 text-right">
                {invoice.taxRatePercent}% 対象（税込）{formatYen(invoice.totalYen)} のうち消費税
              </td>
              <td className="border border-slate-300 px-3 py-2 text-right">{formatYen(invoice.consumptionTaxYen)}</td>
            </tr>
          </tfoot>
        </table>

        {issuer.bankAccount ? (
          <section className="mt-6">
            <h2 className="text-xs font-bold">お振込先</h2>
            <p className="mt-1 whitespace-pre-line rounded border border-slate-300 px-3 py-2 text-xs">
              {issuer.bankAccount}
            </p>
          </section>
        ) : null}

        {issuer.note ? (
          <section className="mt-4">
            <h2 className="text-xs font-bold">備考</h2>
            <p className="mt-1 whitespace-pre-line text-xs">{issuer.note}</p>
          </section>
        ) : null}
      </article>
    </div>
  );
}
