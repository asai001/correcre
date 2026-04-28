"use client";

import { Box, Paper, Typography } from "@mui/material";

type Props = {
  heading: string;
  merchandiseName: string;
  serviceDescription: string;
  priceYen: number;
  requiredPoint: number;
  deliveryMethods: string[];
  serviceArea: string;
  genre: string;
  genreOther: string;
  publishDate: string;
  cardImagePreviewUrl?: string;
  detailImagePreviewUrl?: string;
  merchantCompanyName: string;
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
  const headingPreview = props.heading || "見出し";
  const merchandiseName = props.merchandiseName || "商品・サービス名";
  const providerName = props.merchantCompanyName || "御社名";
  const previewTitle = `${headingPreview} | ${providerName}`;
  const requiredPointLabel =
    Number.isFinite(props.requiredPoint) && props.requiredPoint > 0
      ? `${new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 2 }).format(props.requiredPoint)}pt`
      : "未設定";
  const areaSummary = props.serviceArea.trim() || "未設定";
  const deliveryMethodSummary = props.deliveryMethods.length > 0 ? props.deliveryMethods.join("、") : "未設定";
  const descriptionPreview =
    props.serviceDescription.trim() || "商品の特徴や利用シーンが伝わる説明文を入力してください。";
  const genreLabel = props.genre === "その他" ? props.genreOther.trim() || "その他" : props.genre;
  const publishYear = props.publishDate ? props.publishDate.slice(0, 4) : "----";
  const publishMonthDay = props.publishDate ? props.publishDate.slice(5).replace("-", "/") : "--/--";
  const publishFullDate = props.publishDate
    ? `${props.publishDate.slice(0, 4)}年${Number(props.publishDate.slice(5, 7))}月${Number(props.publishDate.slice(8, 10))}日`
    : "未設定";

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

          <div className="mt-4 p-0">
            {props.cardImagePreviewUrl ? (
              <Box
                component="img"
                src={props.cardImagePreviewUrl}
                alt={previewTitle}
                className="aspect-[16/10] h-full w-full border border-slate-300 object-cover shadow-[0_2px_10px_rgba(15,23,42,0.14)]"
              />
            ) : (
              <div className="flex aspect-[16/10] items-center justify-center border border-slate-300 bg-[linear-gradient(135deg,#e0f0f5_0%,#f8fafc_100%)] px-6 text-center text-sm text-slate-500 shadow-[0_2px_10px_rgba(15,23,42,0.14)]">
                商品画像プレビュー
              </div>
            )}

            <div className="px-0 pb-1 pt-6">
              <Typography variant="h6" className="text-[1.4rem] font-bold leading-[1.45] text-slate-900">
                {previewTitle}
              </Typography>

              <div className="mt-5 overflow-hidden border border-[#75afe1] bg-white">
                <div className="grid grid-cols-[136px_minmax(0,1fr)] border-b border-[#75afe1]">
                  <div className="bg-[#86bcea] px-4 py-3 text-sm font-semibold text-slate-900">必要ポイント数</div>
                  <div className="flex items-center justify-center px-4 py-3 text-sm text-slate-700">
                    {requiredPointLabel}
                  </div>
                </div>
                <div className="grid grid-cols-[136px_minmax(0,1fr)] border-b border-[#75afe1]">
                  <div className="bg-[#86bcea] px-4 py-3 text-sm font-semibold text-slate-900">対応エリア</div>
                  <div className="flex items-center justify-center px-4 py-3 text-center text-sm text-slate-700">
                    {areaSummary}
                  </div>
                </div>
                <div className="grid grid-cols-[136px_minmax(0,1fr)] border-b border-[#75afe1]">
                  <div className="bg-[#86bcea] px-4 py-3 text-sm font-semibold text-slate-900">提供方法</div>
                  <div className="flex items-center justify-center px-4 py-3 text-sm text-slate-700">
                    {deliveryMethodSummary}
                  </div>
                </div>
                <div className="grid grid-cols-[136px_minmax(0,1fr)]">
                  <div className="bg-[#86bcea] px-4 py-3 text-sm font-semibold text-slate-900">ジャンル</div>
                  <div className="flex items-center justify-center px-4 py-3 text-sm text-slate-700">{genreLabel}</div>
                </div>
              </div>
            </div>
          </div>
        </Paper>

        <Paper elevation={0} className="border border-slate-200 bg-white p-5 shadow-sm">
          <Typography variant="h6" className="font-semibold text-slate-900">
            詳細ページプレビュー
          </Typography>
          <Typography variant="body2" className="!mt-1 text-slate-500">
            個別商品の説明ページでの見え方です。
          </Typography>

          <div className="mt-5 grid grid-cols-[72px_minmax(0,1fr)] gap-5">
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
            <PreviewRow label="価格（参考）">
              {Number.isFinite(props.priceYen) && props.priceYen > 0
                ? `${new Intl.NumberFormat("ja-JP").format(props.priceYen)}円`
                : "未設定"}
            </PreviewRow>
          </div>
        </Paper>
      </div>
    </div>
  );
}
