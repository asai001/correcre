"use client";

import type { ReactNode } from "react";

import { faCircleInfo, faShoppingCart } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import type { PublicMerchandiseDetail } from "../types";

function formatPoint(value: number) {
  return `${value.toLocaleString("ja-JP")}pt`;
}

function DetailRow({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className="grid grid-cols-[140px_minmax(0,1fr)] border-b border-slate-200 last:border-b-0 sm:grid-cols-[180px_minmax(0,1fr)]">
      <div className="bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-700">{label}</div>
      <div className="px-4 py-5 text-sm leading-6 text-slate-800">{children}</div>
    </div>
  );
}

type Props = {
  item: PublicMerchandiseDetail;
  /** 交換ボタンやお気に入りなどの操作領域。プレビューでは操作不可のモックを差し込む。 */
  actionSlot?: ReactNode;
  /**
   * true の場合は常に1カラム（SPレイアウト）で描画する。
   * 提携企業側のプレビューでは画面幅に関わらず従業員アプリの SP 表示を再現するために使う。
   */
  forceSingleColumn?: boolean;
};

/**
 * 従業員アプリの商品交換詳細ページの見た目をそのまま提供する共有コンポーネント。
 * 従業員側の詳細ページと、提携企業側の商品プレビューの双方で使い回し、デザインを完全に揃える。
 */
export default function MerchandiseDetailView({ item, actionSlot, forceSingleColumn = false }: Props) {
  const merchandiseName = item.merchandiseName || item.heading || "商品・サービス";
  const merchantName = item.merchantName || "提供会社";
  const genreLabel = item.genre === "その他" ? item.genreOther?.trim() || "その他" : item.genre;
  const areaLabel = item.serviceArea?.trim() || "未設定";
  const deliveryLabel = item.deliveryMethods.length > 0 ? item.deliveryMethods.join(" / ") : "未設定";

  return (
    <section
      className={
        forceSingleColumn
          ? "grid grid-cols-1 gap-6"
          : "grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5.5fr)_minmax(0,4.5fr)]"
      }
    >
      <div className={forceSingleColumn ? undefined : "lg:sticky lg:top-6 lg:self-start"}>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex w-full items-center justify-center overflow-hidden rounded-xl bg-slate-50">
            {item.detailImageViewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.detailImageViewUrl} alt={merchandiseName} className="h-auto w-full object-contain" />
            ) : (
              <div className="flex aspect-[4/3] w-full items-center justify-center px-6 text-center text-sm text-slate-400">
                登録された商品画像がここに表示されます。
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-wrap items-center gap-2">
            {item.tags?.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"
              >
                {tag}
              </span>
            ))}
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {genreLabel}
            </span>
          </div>

          <div>
            <h2 className="text-2xl font-bold leading-snug text-slate-900 sm:text-[1.75rem]">{merchandiseName}</h2>
            <p className="mt-2 text-sm text-slate-500">{merchantName}</p>
          </div>

          <div className="flex items-baseline gap-2 border-y border-slate-200 py-4 text-amber-600">
            <FontAwesomeIcon icon={faShoppingCart} className="text-xl" />
            <span className="text-3xl font-bold tracking-tight sm:text-4xl">
              {item.requiredPoint > 0 ? new Intl.NumberFormat("ja-JP").format(item.requiredPoint) : "—"}
            </span>
            <span className="text-base font-semibold">pt</span>
          </div>

          {item.serviceDescription ? (
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-700">
              <p className="whitespace-pre-line">{item.serviceDescription}</p>
            </div>
          ) : null}

          {actionSlot}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
            <FontAwesomeIcon icon={faCircleInfo} className="text-slate-500" />
            <h3 className="text-base font-bold text-slate-900">商品詳細情報</h3>
          </header>

          <div>
            {item.productCode ? <DetailRow label="商品コード">{item.productCode}</DetailRow> : null}
            <DetailRow label="必要ポイント数">{formatPoint(item.requiredPoint)}</DetailRow>
            <DetailRow label="対応エリア">{areaLabel}</DetailRow>
            <DetailRow label="提供タイプ">{deliveryLabel}</DetailRow>
            <DetailRow label="ジャンル">{genreLabel}</DetailRow>
            {item.contentVolume ? <DetailRow label="内容量">{item.contentVolume}</DetailRow> : null}
            {item.expiration ? <DetailRow label="賞味期限">{item.expiration}</DetailRow> : null}
            {item.deliverySchedule ? <DetailRow label="お届け予定">{item.deliverySchedule}</DetailRow> : null}
            {item.notes ? (
              <DetailRow label="注意事項">
                <p className="whitespace-pre-line">{item.notes}</p>
              </DetailRow>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
