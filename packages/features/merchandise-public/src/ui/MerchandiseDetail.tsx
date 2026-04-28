"use client";

import { Paper, Typography } from "@mui/material";

import type { PublicMerchandiseDetail } from "../types";

type Props = {
  item: PublicMerchandiseDetail;
};

function PreviewRow({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] border-b border-slate-300 last:border-b-0 md:grid-cols-[124px_minmax(0,1fr)]">
      <div className="border-r border-slate-300 bg-white px-3 py-4 text-base font-semibold text-slate-900">{label}</div>
      <div className="bg-white px-4 py-4 text-base leading-8 text-slate-700">{children}</div>
    </div>
  );
}

function formatRequiredPoint(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "未設定";
  }
  return `${new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 2 }).format(value)}pt`;
}

export default function MerchandiseDetail({ item }: Props) {
  const previewTitle = `${item.heading || "見出し"} | ${item.merchantName || "提供会社"}`;
  const requiredPointLabel = formatRequiredPoint(item.requiredPoint);
  const areaSummary = item.serviceArea.trim() || "未設定";
  const genreLabel = item.genre === "その他" ? (item.genreOther?.trim() || "その他") : item.genre;
  const publishYear = item.publishDate ? item.publishDate.slice(0, 4) : "----";
  const publishMonthDay = item.publishDate ? item.publishDate.slice(5).replace("-", "/") : "--/--";
  const publishFullDate = item.publishDate
    ? `${item.publishDate.slice(0, 4)}年${Number(item.publishDate.slice(5, 7))}月${Number(item.publishDate.slice(8, 10))}日`
    : "未設定";

  return (
    <Paper elevation={0} className="border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-5">
        <div className="border-r border-slate-300 text-center">
          <Typography variant="body2" className="text-sm leading-6 text-slate-500">
            {publishYear}
          </Typography>
          <div className="mt-1 text-lg leading-none text-slate-800">{publishMonthDay}</div>
        </div>

        <div>
          <Typography variant="h6" className="text-[1.2rem] font-bold leading-10 text-slate-900 sm:text-[2rem]">
            {previewTitle}
          </Typography>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
            <span>{genreLabel}</span>
            <span>{publishFullDate}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 overflow-hidden border border-slate-300">
        <PreviewRow label="商品・サービス名">{item.merchandiseName || "商品・サービス名"}</PreviewRow>
        <PreviewRow label="提供会社">{item.merchantName || "提供会社"}</PreviewRow>
        <PreviewRow label="提供イメージ">
          <div className="overflow-hidden border border-slate-300 bg-white">
            {item.detailImageViewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.detailImageViewUrl}
                alt={previewTitle}
                className="aspect-[4/3] h-full w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-[linear-gradient(180deg,#eef5f7_0%,#ffffff_100%)] px-6 text-center text-sm text-slate-500">
                登録された商品画像がここに表示されます。
              </div>
            )}
          </div>
        </PreviewRow>
        <PreviewRow label="商品・サービス内容">
          <p className="whitespace-pre-line">{item.serviceDescription || "(説明なし)"}</p>
        </PreviewRow>
        {item.productCode ? <PreviewRow label="商品コード">{item.productCode}</PreviewRow> : null}
        <PreviewRow label="必要ポイント数">{requiredPointLabel}</PreviewRow>
        <PreviewRow label="対応エリア">
          <ul className="list-disc pl-5">
            <li className="whitespace-pre-line">{areaSummary}</li>
          </ul>
        </PreviewRow>
        <PreviewRow label="提供タイプ">
          <ul className="list-disc pl-5">
            {item.deliveryMethods.length > 0 ? (
              item.deliveryMethods.map((method) => <li key={method}>{method}</li>)
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
        {item.contentVolume ? <PreviewRow label="内容量">{item.contentVolume}</PreviewRow> : null}
        {item.expiration ? <PreviewRow label="賞味期限">{item.expiration}</PreviewRow> : null}
        {item.deliverySchedule ? <PreviewRow label="お届け予定">{item.deliverySchedule}</PreviewRow> : null}
        <PreviewRow label="価格（参考）">
          {Number.isFinite(item.priceYen) && item.priceYen > 0
            ? `${new Intl.NumberFormat("ja-JP").format(item.priceYen)}円`
            : "未設定"}
        </PreviewRow>
        {item.notes ? (
          <PreviewRow label="注意事項">
            <p className="whitespace-pre-line">{item.notes}</p>
          </PreviewRow>
        ) : null}
      </div>
    </Paper>
  );
}
