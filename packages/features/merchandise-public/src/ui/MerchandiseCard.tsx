"use client";

import { faChevronRight, faLocationDot, faShoppingCart, faTag, faTruck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import type { PublicMerchandiseSummary } from "../types";

type Props = {
  item: PublicMerchandiseSummary;
  favoriteSlot?: React.ReactNode;
};

function formatRequiredPoint(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "未設定";
  }
  return `${new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 2 }).format(value)}pt`;
}

function getGenrePalette(genre: string): { background: string; chip: string } {
  switch (genre) {
    case "食品":
      return { background: "linear-gradient(135deg, #fff7c8 0%, #f8fafc 100%)", chip: "bg-amber-50 text-amber-700" };
    case "健康・美容":
      return { background: "linear-gradient(135deg, #fde6e3 0%, #f8fafc 100%)", chip: "bg-rose-50 text-rose-700" };
    case "日用品・生活雑貨":
      return { background: "linear-gradient(135deg, #d8f0e0 0%, #f8fafc 100%)", chip: "bg-emerald-50 text-emerald-700" };
    case "服飾":
      return { background: "linear-gradient(135deg, #e2eaff 0%, #f8fafc 100%)", chip: "bg-indigo-50 text-indigo-700" };
    case "記念":
      return { background: "linear-gradient(135deg, #f7e2ef 0%, #f8fafc 100%)", chip: "bg-fuchsia-50 text-fuchsia-700" };
    default:
      return { background: "linear-gradient(135deg, #e6f1f7 0%, #f8fafc 100%)", chip: "bg-slate-100 text-slate-700" };
  }
}

export default function MerchandiseCard({ item, favoriteSlot }: Props) {
  const palette = getGenrePalette(item.genre);
  const merchantName = item.merchantName || "提供会社";
  const merchandiseName = item.merchandiseName || item.heading || "商品・サービス";
  const requiredPointLabel = formatRequiredPoint(item.requiredPoint);
  const areaSummary = item.serviceArea.trim() || "未設定";
  const deliveryMethodSummary = item.deliveryMethods.length > 0 ? item.deliveryMethods.join("、") : "未設定";
  const genreLabel = item.genre === "その他" ? (item.genreOther?.trim() || "その他") : item.genre;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition group-hover:border-slate-300 group-hover:shadow-md">
      <div
        className="relative flex aspect-[16/10] w-full items-end overflow-hidden border-b border-slate-200"
        style={{ background: item.cardImageViewUrl ? undefined : palette.background }}
      >
        {item.cardImageViewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.cardImageViewUrl} alt={merchandiseName} className="absolute inset-0 h-full w-full object-cover" />
        ) : null}

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {item.tags?.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800"
            >
              {tag}
            </span>
          ))}
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${palette.chip}`}>
            {genreLabel}
          </span>
        </div>

        <div className="relative z-10 m-3 inline-flex items-center gap-1.5 rounded-md bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
          <FontAwesomeIcon icon={faShoppingCart} className="text-slate-500" />
          {requiredPointLabel}
        </div>

        {favoriteSlot ? <div className="absolute right-3 top-3 z-20">{favoriteSlot}</div> : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-base font-bold leading-snug text-slate-900">{merchandiseName}</h3>
          <FontAwesomeIcon icon={faChevronRight} className="mt-1 shrink-0 text-xs text-slate-400" />
        </div>

        <p className="text-xs text-slate-500">{merchantName}</p>

        <ul className="flex flex-wrap gap-1.5 text-xs">
          <li className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-0.5 text-slate-600">
            <FontAwesomeIcon icon={faTruck} className="text-[10px] text-slate-400" />
            {deliveryMethodSummary}
          </li>
          <li className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-0.5 text-slate-600">
            <FontAwesomeIcon icon={faLocationDot} className="text-[10px] text-slate-400" />
            {areaSummary}
          </li>
          <li className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-0.5 text-slate-600">
            <FontAwesomeIcon icon={faTag} className="text-[10px] text-slate-400" />
            {genreLabel}
          </li>
        </ul>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
          <div>
            <p className="text-[11px] text-slate-500">交換ポイント</p>
            <p className="text-2xl font-bold leading-none text-slate-900">
              {Number.isFinite(item.requiredPoint) && item.requiredPoint > 0
                ? new Intl.NumberFormat("ja-JP").format(item.requiredPoint)
                : "—"}
              <span className="ml-1 text-xs font-medium text-slate-500">pt</span>
            </p>
          </div>
          <span className="inline-flex items-center justify-center rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition group-hover:border-slate-900 group-hover:bg-slate-900 group-hover:text-white">
            詳細を見る
          </span>
        </div>
      </div>
    </article>
  );
}
