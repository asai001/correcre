"use client";

import { Box, Paper, Typography } from "@mui/material";
import { faHeart } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { MerchandiseCard, type PublicMerchandiseSummary } from "@correcre/merchandise-public";
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

function PreviewRow({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] border-b border-slate-300 last:border-b-0 md:grid-cols-[124px_minmax(0,1fr)]">
      <div className="border-r border-slate-300 bg-white px-3 py-4 text-base font-semibold text-slate-900">{label}</div>
      <div className="bg-white px-4 py-4 text-base leading-8 text-slate-700">{children}</div>
    </div>
  );
}

export default function MerchandiseFormPreview(props: Props) {
  const merchandiseName = props.merchandiseName || "商品・サービス名";
  const providerName = props.merchantCompanyName || "御社名";
  const previewTitle = `${merchandiseName} | ${providerName}`;
  const requiredPointLabel =
    Number.isFinite(props.requiredPoint) && props.requiredPoint > 0
      ? `${new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 2 }).format(props.requiredPoint)}pt`
      : "未設定";
  const areaSummary = props.serviceArea.trim() || "未設定";
  const descriptionPreview =
    props.serviceDescription.trim() || "商品の特徴や利用シーンが伝わる説明文を入力してください。";
  const genreLabel = props.genre === "その他" ? props.genreOther.trim() || "その他" : props.genre;

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
            個別商品の説明ページでの見え方です。
          </Typography>

          <div className="mt-5">
            <Typography variant="h6" className="text-[1.2rem] font-bold leading-10 text-slate-900 sm:text-[2rem]">
              {previewTitle}
            </Typography>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
              <span>{genreLabel}</span>
            </div>
          </div>

          <div className="mt-8 overflow-hidden border border-slate-300">
            <PreviewRow label="商品・サービス名">{merchandiseName}</PreviewRow>
            <PreviewRow label="提供会社">{providerName}</PreviewRow>
            <PreviewRow label="提供イメージ">
              <div className="overflow-hidden border border-slate-300 bg-white">
                {props.detailImagePreviewUrl ? (
                  <Box
                    component="img"
                    src={props.detailImagePreviewUrl}
                    alt={previewTitle}
                    className="aspect-[4/3] h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-[linear-gradient(180deg,#eef5f7_0%,#ffffff_100%)] px-6 text-center text-sm text-slate-500">
                    登録した商品画像がここに表示されます。
                  </div>
                )}
              </div>
            </PreviewRow>
            <PreviewRow label="商品・サービス内容">
              <p className="whitespace-pre-line">{descriptionPreview}</p>
            </PreviewRow>
            <PreviewRow label="必要ポイント数">{requiredPointLabel}</PreviewRow>
            <PreviewRow label="対応エリア">
              <ul className="list-disc pl-5">
                <li className="whitespace-pre-line">{areaSummary}</li>
              </ul>
            </PreviewRow>
            <PreviewRow label="提供タイプ">
              <ul className="list-disc pl-5">
                {props.deliveryMethods.length > 0 ? (
                  props.deliveryMethods.map((method) => <li key={method}>{method}</li>)
                ) : (
                  <li>未設定</li>
                )}
              </ul>
            </PreviewRow>
            <PreviewRow label="ジャンル">
              <ul className="list-disc pl-5">
                <li>{genreLabel}</li>
              </ul>
            </PreviewRow>
            {props.contentVolume ? <PreviewRow label="内容量">{props.contentVolume}</PreviewRow> : null}
            {props.expiration ? <PreviewRow label="賞味期限">{props.expiration}</PreviewRow> : null}
            {props.deliverySchedule ? <PreviewRow label="お届け予定">{props.deliverySchedule}</PreviewRow> : null}
            {props.notes ? (
              <PreviewRow label="注意事項">
                <p className="whitespace-pre-line">{props.notes}</p>
              </PreviewRow>
            ) : null}
          </div>
        </Paper>
      </div>
    </div>
  );
}
