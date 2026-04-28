"use client";

import Link from "next/link";
import type { Route } from "next";

import { MerchandiseCard, type PublicMerchandiseSummary } from "@correcre/merchandise-public";

import ExchangePageHeader from "./ExchangePageHeader";

type Props = {
  items: PublicMerchandiseSummary[];
  currentPointBalance: number;
};

function buildDetailHref(item: PublicMerchandiseSummary): Route {
  const search = new URLSearchParams({ merchantId: item.merchantId }).toString();
  return `/exchange/${encodeURIComponent(item.merchandiseId)}?${search}` as Route;
}

export default function ExchangeList({ items, currentPointBalance }: Props) {
  return (
    <div className="-mt-px pb-10">
      <ExchangePageHeader currentPointBalance={currentPointBalance} />

      <div className="container mx-auto px-6">
        <div className="mt-8 flex items-center gap-2 text-slate-700">
          <span className="text-emerald-500">✦</span>
          <h2 className="text-lg font-bold tracking-tight sm:text-xl">商品・サービス一覧</h2>
          <span className="ml-auto text-sm text-slate-500">{items.length}件</span>
        </div>

        {items.length === 0 ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            現在、交換可能な商品はありません。
          </div>
        ) : (
          <ul className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <li key={`${item.merchantId}/${item.merchandiseId}`} className="h-full">
                <Link href={buildDetailHref(item)} className="group block h-full">
                  <MerchandiseCard item={item} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
