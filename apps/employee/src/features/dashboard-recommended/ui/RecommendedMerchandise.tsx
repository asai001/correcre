import Link from "next/link";
import type { Route } from "next";

import { MerchandiseCard, type PublicMerchandiseSummary } from "@correcre/merchandise-public";

type Props = {
  items: PublicMerchandiseSummary[];
  showSection: boolean;
};

function buildDetailHref(item: PublicMerchandiseSummary): Route {
  const search = new URLSearchParams({ merchantId: item.merchantId }).toString();
  return `/exchange/${encodeURIComponent(item.merchandiseId)}?${search}` as Route;
}

export default function RecommendedMerchandise({ items, showSection }: Props) {
  if (!showSection || items.length === 0) {
    return null;
  }

  return (
    <section className="mt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            ポイントで交換できる商品
          </h2>
          <p className="mt-1 text-xs text-slate-500">公開中のおすすめ商品をピックアップしています。</p>
        </div>
        <Link
          href={"/exchange" as Route}
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
        >
          一覧を見る →
        </Link>
      </div>

      <ul className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <li key={`${item.merchantId}/${item.merchandiseId}`} className="h-full">
            <Link href={buildDetailHref(item)} className="group block h-full">
              <MerchandiseCard item={item} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
