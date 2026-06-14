"use client";

import { MerchandiseCard, toPublicMerchandiseSummary } from "@correcre/merchandise-public";
import type { Merchant, MerchandiseStatus } from "@correcre/types";

import AdminPageHeader from "@operator/components/AdminPageHeader";

import type { OperatorMerchandiseSummary } from "../model/types";

const STATUS_LABELS: Record<MerchandiseStatus, string> = {
  DRAFT: "下書き",
  PUBLISHED: "公開中",
  UNPUBLISHED: "非公開",
};

const STATUS_BADGE_CLASSES: Record<MerchandiseStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  UNPUBLISHED: "bg-amber-100 text-amber-800",
};

type Props = {
  merchant: Merchant;
  initialItems: OperatorMerchandiseSummary[];
  operatorName: string;
};

export default function MerchantMerchandiseView({ merchant, initialItems, operatorName }: Props) {
  const publishedCount = initialItems.filter((item) => item.status === "PUBLISHED").length;

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        title={`${merchant.name} の登録商品`}
        adminName={operatorName}
        subtitle="提携企業が登録した商品・サービスの内容を確認します"
        backHref="/merchants"
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="text-sm font-semibold text-slate-500">登録商品数</div>
          <div className="mt-3 text-3xl font-bold text-slate-900">
            {initialItems.length.toLocaleString("ja-JP")}
          </div>
        </div>
        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="text-sm font-semibold text-slate-500">公開中</div>
          <div className="mt-3 text-3xl font-bold text-emerald-600">
            {publishedCount.toLocaleString("ja-JP")}
          </div>
        </div>
        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="text-sm font-semibold text-slate-500">非公開・下書き</div>
          <div className="mt-3 text-3xl font-bold text-amber-600">
            {(initialItems.length - publishedCount).toLocaleString("ja-JP")}
          </div>
        </div>
      </section>

      {initialItems.length === 0 ? (
        <div className="rounded-[28px] bg-white p-10 text-center text-sm text-slate-500 shadow-lg shadow-slate-200/70">
          この提携企業が登録した商品はまだありません。
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {initialItems.map((item) => {
            const summary = toPublicMerchandiseSummary(item, merchant.name, {
              cardImageViewUrl: item.cardImageViewUrl,
              detailImageViewUrl: item.detailImageViewUrl,
            });
            return (
              <li key={item.merchandiseId} className="flex h-full flex-col gap-2">
                <span
                  className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE_CLASSES[item.status]}`}
                >
                  {STATUS_LABELS[item.status]}
                </span>
                <MerchandiseCard item={summary} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
