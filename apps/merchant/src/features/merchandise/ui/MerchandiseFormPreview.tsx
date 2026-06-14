"use client";

import { Paper, Typography } from "@mui/material";
import { faHeart } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  MerchandiseCard,
  MerchandiseDetailView,
  type PublicMerchandiseDetail,
  type PublicMerchandiseSummary,
} from "@correcre/merchandise-public";
import type { MerchandiseDeliveryMethod, MerchandiseGenre } from "@correcre/types";

type Props = {
  merchandiseName: string;
  serviceDescription: string;
  priceYen: number;
  requiredPoint: number;
  deliveryMethods: string[];
  serviceArea: string;
  genre: string;
  genreOther: string;
  cardImagePreviewUrl?: string;
  detailImagePreviewUrl?: string;
  merchantCompanyName: string;
  contentVolume?: string;
  expiration?: string;
  deliverySchedule?: string;
  notes?: string;
};

export default function MerchandiseFormPreview(props: Props) {
  const merchandiseName = props.merchandiseName || "商品・サービス名";
  const providerName = props.merchantCompanyName || "御社名";

  // 一覧カードプレビューは従業員アプリの交換ページと同じ MerchandiseCard で描画し、見え方を忠実に再現する。
  const previewCardItem: PublicMerchandiseSummary = {
    merchandiseId: "preview",
    merchantId: "preview",
    merchantName: providerName,
    heading: merchandiseName,
    merchandiseName,
    serviceDescription: props.serviceDescription,
    priceYen: props.priceYen,
    requiredPoint: props.requiredPoint,
    deliveryMethods: props.deliveryMethods as MerchandiseDeliveryMethod[],
    serviceArea: props.serviceArea,
    genre: props.genre as MerchandiseGenre,
    genreOther: props.genreOther || undefined,
    cardImageViewUrl: props.cardImagePreviewUrl,
  };

  // 詳細ページプレビューは従業員アプリの商品交換詳細ページと同じ MerchandiseDetailView を使い、
  // SP レイアウト（1カラム）で完全に同じデザインを再現する。
  const previewDetailItem: PublicMerchandiseDetail = {
    ...previewCardItem,
    detailImageViewUrl: props.detailImagePreviewUrl,
    contentVolume: props.contentVolume || undefined,
    expiration: props.expiration || undefined,
    deliverySchedule: props.deliverySchedule || undefined,
    notes: props.notes || undefined,
  };

  return (
    <div className="xl:sticky xl:top-6 xl:self-start">
      <div className="space-y-5">
        <Paper elevation={0} className="border border-slate-200 bg-white p-5 shadow-sm">
          <Typography variant="h6" className="font-semibold text-slate-900">
            一覧カードプレビュー
          </Typography>
          <Typography variant="body2" className="!mt-1 text-slate-500">
            商品交換ページでの見え方です。
          </Typography>

          <div className="group mt-4 block h-full">
            <MerchandiseCard
              item={previewCardItem}
              favoriteSlot={
                // 従業員アプリのカードと見た目を揃えるための、操作不可のお気に入りハートのモック。
                <span
                  aria-hidden
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-sm text-slate-300 shadow-sm"
                >
                  <FontAwesomeIcon icon={faHeart} />
                </span>
              }
            />
          </div>
        </Paper>

        <Paper elevation={0} className="border border-slate-200 bg-white p-5 shadow-sm">
          <Typography variant="h6" className="font-semibold text-slate-900">
            詳細ページプレビュー
          </Typography>
          <Typography variant="body2" className="!mt-1 text-slate-500">
            従業員アプリの商品交換詳細ページ（スマートフォン表示）と同じ見え方です。
          </Typography>

          <div className="mt-5">
            <MerchandiseDetailView
              item={previewDetailItem}
              forceSingleColumn
              actionSlot={
                // 従業員アプリの交換ボタン・お気に入りと同じ見た目の、操作不可のモック。
                <div className="flex items-center gap-3">
                  <span className="flex-1 rounded-lg bg-slate-300 px-6 py-3.5 text-center text-sm font-bold text-white">
                    ポイントで交換する
                  </span>
                  <span
                    aria-hidden
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-300 shadow-sm"
                  >
                    <FontAwesomeIcon icon={faHeart} />
                  </span>
                </div>
              }
            />
          </div>
        </Paper>
      </div>
    </div>
  );
}
