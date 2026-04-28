"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { MERCHANDISE_TAG_VALUES, type MerchandiseTag } from "@correcre/types";

import AdminPageHeader from "@merchant/components/AdminPageHeader";
import {
  createMerchandise,
  requestMerchandiseUploadUrl,
  updateMerchandise,
  uploadMerchandiseImage,
} from "../api/client";
import type {
  CreateMerchandiseRequest,
  MerchandiseFormPayload,
  MerchandiseSummary,
} from "../model/types";
import MerchandiseFormPreview from "./MerchandiseFormPreview";

const deliveryMethodOptions = ["来店", "出張", "発送", "オンライン"] as const;
const genreOptions = ["健康・美容", "日用品・生活雑貨", "服飾", "記念", "食品", "その他"] as const;

type ImageTarget = "card" | "detail";

type ImageState = {
  s3Key?: string;
  contentType?: string;
  previewUrl?: string;
  fileName?: string;
};

type FormState = {
  heading: string;
  merchandiseName: string;
  serviceDescription: string;
  priceYen: string;
  requiredPoint: string;
  deliveryMethods: string[];
  serviceArea: string;
  genre: (typeof genreOptions)[number];
  genreOther: string;
  publishDate: string;
  tags: MerchandiseTag[];
  productCode: string;
  contentVolume: string;
  expiration: string;
  deliverySchedule: string;
  notes: string;
};

type Props = {
  mode: "create" | "edit";
  merchantName: string;
  merchantCompanyName: string;
  initial?: MerchandiseSummary;
};

function formatNumberInput(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function calculateRequiredPoint(priceYen: number) {
  return Math.ceil(priceYen / 5);
}

function getInitialFormState(initial: MerchandiseSummary | undefined): FormState {
  if (!initial) {
    const today = new Date();
    const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 10);
    return {
      heading: "",
      merchandiseName: "",
      serviceDescription: "",
      priceYen: "",
      requiredPoint: "",
      deliveryMethods: ["発送"],
      serviceArea: "",
      genre: "食品",
      genreOther: "",
      publishDate: localDate,
      tags: [],
      productCode: "",
      contentVolume: "",
      expiration: "",
      deliverySchedule: "",
      notes: "",
    };
  }

  return {
    heading: initial.heading,
    merchandiseName: initial.merchandiseName,
    serviceDescription: initial.serviceDescription,
    priceYen: formatNumberInput(initial.priceYen),
    requiredPoint: formatNumberInput(initial.requiredPoint),
    deliveryMethods: [...initial.deliveryMethods],
    serviceArea: initial.serviceArea,
    genre: initial.genre,
    genreOther: initial.genreOther ?? "",
    publishDate: initial.publishDate ?? "",
    tags: [...(initial.tags ?? [])],
    productCode: initial.productCode ?? "",
    contentVolume: initial.contentVolume ?? "",
    expiration: initial.expiration ?? "",
    deliverySchedule: initial.deliverySchedule ?? "",
    notes: initial.notes ?? "",
  };
}

function getInitialImageState(initial: MerchandiseSummary | undefined, target: ImageTarget): ImageState {
  if (!initial) return {};
  if (target === "card") {
    return {
      s3Key: initial.cardImage?.s3Key,
      contentType: initial.cardImage?.contentType,
      previewUrl: initial.cardImageViewUrl,
    };
  }
  return {
    s3Key: initial.detailImage?.s3Key,
    contentType: initial.detailImage?.contentType,
    previewUrl: initial.detailImageViewUrl,
  };
}

export default function MerchandiseForm({ mode, merchantName, merchantCompanyName, initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => getInitialFormState(initial));
  const [cardImage, setCardImage] = useState<ImageState>(() => getInitialImageState(initial, "card"));
  const [detailImage, setDetailImage] = useState<ImageState>(() => getInitialImageState(initial, "detail"));
  const [submitting, setSubmitting] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<ImageTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const priceYen = Number(form.priceYen);
  const autoRequiredPoint = Number.isFinite(priceYen) && priceYen > 0 ? calculateRequiredPoint(priceYen) : 0;

  useEffect(() => {
    if (!form.requiredPoint && autoRequiredPoint > 0) {
      setForm((prev) => ({ ...prev, requiredPoint: String(autoRequiredPoint) }));
    }
    // We only want to seed required point once on mount or when price first becomes valid.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRequiredPoint]);

  const handleField = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDeliveryToggle = (method: string) => (_event: ChangeEvent<HTMLInputElement>, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      deliveryMethods: checked
        ? Array.from(new Set([...prev.deliveryMethods, method]))
        : prev.deliveryMethods.filter((entry) => entry !== method),
    }));
  };

  const handleTagToggle = (tag: MerchandiseTag) => (_event: ChangeEvent<HTMLInputElement>, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      tags: checked
        ? Array.from(new Set([...prev.tags, tag]))
        : prev.tags.filter((entry) => entry !== tag),
    }));
  };

  const handleImageChange = (target: ImageTarget) => async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setError(null);
    setUploadingTarget(target);

    try {
      const upload = await requestMerchandiseUploadUrl(file.type, file.size);
      await uploadMerchandiseImage(upload.uploadUrl, file);

      const previewUrl = URL.createObjectURL(file);
      const next: ImageState = {
        s3Key: upload.s3Key,
        contentType: file.type,
        previewUrl,
        fileName: file.name,
      };

      if (target === "card") {
        setCardImage((prev) => {
          if (prev.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(prev.previewUrl);
          return next;
        });
      } else {
        setDetailImage((prev) => {
          if (prev.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(prev.previewUrl);
          return next;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "画像のアップロードに失敗しました。");
    } finally {
      setUploadingTarget(null);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;

    setError(null);
    setNotice(null);
    setSubmitting(true);

    try {
      const payload: CreateMerchandiseRequest = {
        heading: form.heading,
        merchandiseName: form.merchandiseName,
        serviceDescription: form.serviceDescription,
        priceYen: Number(form.priceYen),
        requiredPoint: Number(form.requiredPoint || form.priceYen ? calculateRequiredPoint(Number(form.priceYen)) : 0),
        deliveryMethods: form.deliveryMethods as MerchandiseFormPayload["deliveryMethods"],
        serviceArea: form.serviceArea,
        genre: form.genre,
        genreOther: form.genre === "その他" ? form.genreOther : undefined,
        publishDate: form.publishDate || undefined,
        cardImage:
          cardImage.s3Key && cardImage.contentType
            ? { s3Key: cardImage.s3Key, contentType: cardImage.contentType }
            : undefined,
        detailImage:
          detailImage.s3Key && detailImage.contentType
            ? { s3Key: detailImage.s3Key, contentType: detailImage.contentType }
            : undefined,
        tags: form.tags.length > 0 ? form.tags : undefined,
        productCode: form.productCode || undefined,
        contentVolume: form.contentVolume || undefined,
        expiration: form.expiration || undefined,
        deliverySchedule: form.deliverySchedule || undefined,
        notes: form.notes || undefined,
      };

      if (mode === "create") {
        const created = await createMerchandise(payload);
        setNotice(`「${created.merchandiseName}」を登録しました。`);
        router.push(`/merchandise/${encodeURIComponent(created.merchandiseId)}`);
        router.refresh();
      } else if (initial) {
        const updated = await updateMerchandise(initial.merchandiseId, payload);
        setNotice(`「${updated.merchandiseName}」を更新しました。`);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  const previewTitle = useMemo(
    () => `${form.heading || "見出し"} | ${form.merchandiseName || "商品名"}`,
    [form.heading, form.merchandiseName],
  );

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        title={mode === "create" ? "商品・サービス 新規登録" : "商品・サービス 編集"}
        adminName={merchantName}
        subtitle={mode === "create" ? "新しい商品・サービスを登録します" : `merchandiseId: ${initial?.merchandiseId ?? ""}`}
        backHref="/merchandise"
      />

      {error ? <Alert severity="error">{error}</Alert> : null}
      {notice ? <Alert severity="success">{notice}</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <div className="space-y-6">
      <Paper elevation={0} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <Typography variant="h6" className="font-semibold text-slate-900">
          基本情報
        </Typography>

        <Stack spacing={2.5} className="!mt-4">
          <TextField label="見出し" required fullWidth value={form.heading} onChange={handleField("heading")} />
          <TextField
            label="商品・サービス名"
            required
            fullWidth
            value={form.merchandiseName}
            onChange={handleField("merchandiseName")}
          />
          <TextField
            label="商品・サービス内容"
            required
            fullWidth
            multiline
            minRows={3}
            value={form.serviceDescription}
            onChange={handleField("serviceDescription")}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="価格（税・送料・出張費等込み）"
              type="number"
              required
              fullWidth
              value={form.priceYen}
              onChange={handleField("priceYen")}
              slotProps={{ input: { endAdornment: <InputAdornment position="end">円</InputAdornment> } }}
            />
            <TextField
              label="必要ポイント数（自動: 価格÷5）"
              type="number"
              required
              fullWidth
              value={form.requiredPoint}
              onChange={handleField("requiredPoint")}
              slotProps={{ input: { endAdornment: <InputAdornment position="end">pt</InputAdornment> } }}
              helperText={autoRequiredPoint ? `推奨: ${autoRequiredPoint}pt` : undefined}
            />
          </div>
          <FormControl className="rounded-2xl border border-slate-200 px-4 py-4">
            <Typography variant="subtitle2" className="text-slate-800">
              提供方法
            </Typography>
            <FormGroup className="mt-3 grid gap-1 sm:grid-cols-2">
              {deliveryMethodOptions.map((option) => (
                <FormControlLabel
                  key={option}
                  control={
                    <Checkbox
                      size="small"
                      checked={form.deliveryMethods.includes(option)}
                      onChange={handleDeliveryToggle(option)}
                    />
                  }
                  label={option}
                />
              ))}
            </FormGroup>
          </FormControl>
          <TextField
            label="対応エリア"
            required
            fullWidth
            multiline
            minRows={2}
            value={form.serviceArea}
            onChange={handleField("serviceArea")}
            placeholder="名古屋市中村区... / 全国対応 / 東海3県 など"
          />
          <div className="grid gap-4 md:grid-cols-2">
            <TextField select label="ジャンル" required fullWidth value={form.genre} onChange={handleField("genre")}>
              {genreOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
            {form.genre === "その他" ? (
              <TextField
                label="ジャンル（その他）"
                required
                fullWidth
                value={form.genreOther}
                onChange={handleField("genreOther")}
              />
            ) : (
              <div />
            )}
          </div>
          <TextField
            label="掲載日"
            type="date"
            fullWidth
            value={form.publishDate}
            onChange={handleField("publishDate")}
            InputLabelProps={{ shrink: true }}
          />
          <FormControl className="rounded-2xl border border-slate-200 px-4 py-4">
            <Typography variant="subtitle2" className="text-slate-800">
              カテゴリーバッジ（任意）
            </Typography>
            <Typography variant="caption" className="text-slate-500">
              一覧カードの目立つ位置に表示されます。
            </Typography>
            <FormGroup className="mt-3 grid gap-1 sm:grid-cols-3">
              {MERCHANDISE_TAG_VALUES.map((tag) => (
                <FormControlLabel
                  key={tag}
                  control={
                    <Checkbox
                      size="small"
                      checked={form.tags.includes(tag)}
                      onChange={handleTagToggle(tag)}
                    />
                  }
                  label={tag}
                />
              ))}
            </FormGroup>
          </FormControl>
        </Stack>
      </Paper>

      <Paper elevation={0} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <Typography variant="h6" className="font-semibold text-slate-900">
          詳細メタ情報（任意）
        </Typography>
        <Typography variant="body2" className="!mt-1 text-slate-500">
          詳細ページで「商品詳細情報」テーブルに表示されます。
        </Typography>
        <Stack spacing={2.5} className="!mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="商品コード"
              fullWidth
              value={form.productCode}
              onChange={handleField("productCode")}
              placeholder="F001-2024 など"
            />
            <TextField
              label="内容量"
              fullWidth
              value={form.contentVolume}
              onChange={handleField("contentVolume")}
              placeholder="6個入り（個包装） など"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="賞味期限 / 有効期限"
              fullWidth
              value={form.expiration}
              onChange={handleField("expiration")}
              placeholder="製造日より冷蔵で5日間 など"
            />
            <TextField
              label="お届け予定 / 提供までの目安"
              fullWidth
              value={form.deliverySchedule}
              onChange={handleField("deliverySchedule")}
              placeholder="申込みから7〜10営業日 など"
            />
          </div>
          <TextField
            label="注意事項"
            fullWidth
            multiline
            minRows={3}
            value={form.notes}
            onChange={handleField("notes")}
            placeholder="要冷蔵保存 / アレルギー表示 など"
          />
        </Stack>
      </Paper>

      <Paper elevation={0} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <Typography variant="h6" className="font-semibold text-slate-900">
          画像
        </Typography>
        <Typography variant="body2" className="!mt-1 text-slate-500">
          一覧カード用と詳細ページ用に別々の画像をアップロードできます。JPEG / PNG / WebP、10MB まで。
        </Typography>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {(["card", "detail"] as const).map((target) => {
            const image = target === "card" ? cardImage : detailImage;
            const labelTitle = target === "card" ? "一覧カード用画像" : "詳細ページ用画像";

            return (
              <div key={target} className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <Typography variant="subtitle2" className="text-slate-800">
                  {labelTitle}
                </Typography>
                <Button component="label" variant="outlined" className="!mt-4 !rounded-full !px-5">
                  {uploadingTarget === target ? "アップロード中..." : "画像を選択"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={handleImageChange(target)}
                  />
                </Button>
                <Typography variant="body2" className="!mt-3 text-slate-600">
                  {image.fileName ?? (image.s3Key ? "登録済みの画像" : "画像は未選択です。")}
                </Typography>
                <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white">
                  {image.previewUrl ? (
                    <Box
                      component="img"
                      src={image.previewUrl}
                      alt={previewTitle}
                      className="aspect-[4/3] h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 px-6 text-center text-sm text-slate-500">
                      画像プレビュー
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Paper>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button
          variant="outlined"
          color="inherit"
          disabled={submitting}
          className="!rounded-full !px-6 !py-3"
          onClick={() => router.push("/merchandise")}
        >
          一覧へ戻る
        </Button>
        <Button
          variant="contained"
          disabled={submitting || uploadingTarget !== null}
          onClick={handleSubmit}
          className="!rounded-full !px-7 !py-3"
        >
          {submitting ? "保存中..." : mode === "create" ? "登録する" : "変更を保存"}
        </Button>
      </div>
        </div>

        <MerchandiseFormPreview
          heading={form.heading}
          merchandiseName={form.merchandiseName}
          serviceDescription={form.serviceDescription}
          priceYen={Number(form.priceYen)}
          requiredPoint={Number(form.requiredPoint)}
          deliveryMethods={form.deliveryMethods}
          serviceArea={form.serviceArea}
          genre={form.genre}
          genreOther={form.genreOther}
          publishDate={form.publishDate}
          cardImagePreviewUrl={cardImage.previewUrl}
          detailImagePreviewUrl={detailImage.previewUrl}
          merchantCompanyName={merchantCompanyName}
          tags={form.tags}
          productCode={form.productCode}
          contentVolume={form.contentVolume}
          expiration={form.expiration}
          deliverySchedule={form.deliverySchedule}
          notes={form.notes}
        />
      </div>
    </div>
  );
}
