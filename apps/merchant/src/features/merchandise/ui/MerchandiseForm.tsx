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
  Switch,
  TextField,
  Typography,
} from "@mui/material";

import AdminPageHeader from "@merchant/components/AdminPageHeader";
import type { FulfillmentType, ProductFulfillment, TemperatureZone } from "@correcre/types";
import { AVAILABLE_TIME_SLOT_VALUES, resolveMerchandiseFulfillment } from "@correcre/types";
import {
  createMerchandise,
  fetchSchedulePreview,
  requestMerchandiseUploadUrl,
  updateMerchandise,
  uploadMerchandiseImage,
} from "../api/client";
import type {
  CreateMerchandiseRequest,
  MerchandiseFormPayload,
  MerchandiseSummary,
  SchedulePreviewResponse,
} from "../model/types";
import {
  formatMerchandiseActor,
  formatMerchandiseDateTime,
  formatMerchandiseHistoryLabel,
} from "../model/audit";
import MerchandiseFormPreview from "./MerchandiseFormPreview";

const deliveryMethodOptions = ["来店", "出張", "発送", "オンライン"] as const;
const genreOptions = ["健康・美容", "日用品・生活雑貨", "服飾", "記念", "食品", "その他"] as const;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TOO_LARGE_MESSAGE = "10MB以上の画像はアップロードできません。";

type ImageTarget = "card" | "detail";

type ImageState = {
  s3Key?: string;
  contentType?: string;
  previewUrl?: string;
  fileName?: string;
};

type FormState = {
  merchandiseName: string;
  serviceDescription: string;
  priceYen: string;
  deliveryMethods: string[];
  serviceArea: string;
  genre: (typeof genreOptions)[number];
  genreOther: string;
  contentVolume: string;
  expiration: string;
  deliverySchedule: string;
  notes: string;
};

const temperatureZoneOptions: { value: TemperatureZone; label: string }[] = [
  { value: "AMBIENT", label: "常温" },
  { value: "REFRIGERATED", label: "冷蔵" },
  { value: "FROZEN", label: "冷凍" },
];

const fulfillmentTypeOptions: { value: FulfillmentType; label: string }[] = [
  { value: "SHIPPING", label: "配送" },
  { value: "STORE_PICKUP", label: "店頭受け取り" },
];

const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];

function isFreshZone(zone: TemperatureZone) {
  return zone === "REFRIGERATED" || zone === "FROZEN";
}

type FulfillmentFormState = {
  fulfillmentType: FulfillmentType;
  temperatureZone: TemperatureZone;
  requiresScheduling: boolean;
  // merchant が手動でスイッチを触ったか。触るまでは温度帯に応じた既定値へ自動追従する。
  requiresSchedulingTouched: boolean;
  leadTimeBusinessDays: string;
  transitDays: string;
  shippableWeekdays: number[];
  cutoffTime: string;
  availableTimeSlots: string[];
  // 時間帯も同様。冷蔵・冷凍では受取失敗を減らすため既定で全て選んだ状態にする。
  availableTimeSlotsTouched: boolean;
  candidateCount: string;
};

function getInitialFulfillmentState(initial: MerchandiseSummary | undefined): FulfillmentFormState {
  const resolved = resolveMerchandiseFulfillment(initial?.fulfillment);
  return {
    fulfillmentType: resolved.fulfillmentType,
    temperatureZone: resolved.temperatureZone,
    requiresScheduling: resolved.requiresScheduling,
    requiresSchedulingTouched: Boolean(initial?.fulfillment),
    leadTimeBusinessDays: String(resolved.leadTimeBusinessDays),
    transitDays: String(resolved.transitDays),
    shippableWeekdays: [...resolved.shippableWeekdays],
    cutoffTime: resolved.cutoffTime,
    availableTimeSlots: [...resolved.availableTimeSlots],
    availableTimeSlotsTouched: Boolean(initial?.fulfillment),
    candidateCount: String(resolved.candidateCount),
  };
}

function buildFulfillmentPayload(state: FulfillmentFormState): ProductFulfillment {
  return {
    fulfillmentType: state.fulfillmentType,
    temperatureZone: state.temperatureZone,
    requiresScheduling: state.requiresScheduling,
    leadTimeBusinessDays: Number(state.leadTimeBusinessDays),
    transitDays: Number(state.transitDays),
    shippableWeekdays: [...state.shippableWeekdays].sort((a, b) => a - b),
    cutoffTime: state.cutoffTime,
    availableTimeSlots: state.availableTimeSlots,
    candidateCount: Number(state.candidateCount),
  };
}

// 外部予約（ホットペッパービューティー等）が必要なサービスの案内設定。
// 空き枠は本システムと同期できないため、URL とテキストの案内だけを保存する。
type ReservationFormState = {
  enabled: boolean;
  reservationUrl: string;
  instructions: string;
};

function getInitialReservationState(initial: MerchandiseSummary | undefined): ReservationFormState {
  return {
    enabled: Boolean(initial?.reservation),
    reservationUrl: initial?.reservation?.reservationUrl ?? "",
    instructions: initial?.reservation?.instructions ?? "",
  };
}

type Props = {
  mode: "create" | "edit";
  merchantName: string;
  merchantDisplayName?: string;
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
    return {
      merchandiseName: "",
      serviceDescription: "",
      priceYen: "",
      deliveryMethods: ["発送"],
      serviceArea: "",
      genre: "食品",
      genreOther: "",
      contentVolume: "",
      expiration: "",
      deliverySchedule: "",
      notes: "",
    };
  }

  return {
    merchandiseName: initial.merchandiseName,
    serviceDescription: initial.serviceDescription,
    priceYen: formatNumberInput(initial.priceYen),
    deliveryMethods: [...initial.deliveryMethods],
    serviceArea: initial.serviceArea,
    genre: initial.genre,
    genreOther: initial.genreOther ?? "",
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

export default function MerchandiseForm({ mode, merchantName, merchantDisplayName, merchantCompanyName, initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => getInitialFormState(initial));
  const [fulfillment, setFulfillment] = useState<FulfillmentFormState>(() => getInitialFulfillmentState(initial));
  const [reservation, setReservation] = useState<ReservationFormState>(() => getInitialReservationState(initial));
  const [cardImage, setCardImage] = useState<ImageState>(() => getInitialImageState(initial, "card"));
  const [detailImage, setDetailImage] = useState<ImageState>(() => getInitialImageState(initial, "detail"));
  const [submitting, setSubmitting] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<ImageTarget | null>(null);
  const [imageErrorByTarget, setImageErrorByTarget] = useState<Record<ImageTarget, string | null>>({
    card: null,
    detail: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<SchedulePreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const priceYen = Number(form.priceYen);
  const autoRequiredPoint = Number.isFinite(priceYen) && priceYen > 0 ? calculateRequiredPoint(priceYen) : 0;

  const handleField = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFulfillmentField =
    (field: "leadTimeBusinessDays" | "transitDays" | "cutoffTime" | "candidateCount") =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setFulfillment((prev) => ({ ...prev, [field]: value }));
    };

  const handleTemperatureZoneChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as TemperatureZone;
    setFulfillment((prev) => ({
      ...prev,
      temperatureZone: value,
      // 冷蔵・冷凍は日程調整必須が既定。merchant が手動で切り替えるまでは自動追従する。
      requiresScheduling: prev.requiresSchedulingTouched
        ? prev.requiresScheduling
        : isFreshZone(value),
      // 時間帯も同様に追従させる。生鮮品で時間帯が選べないと受取失敗が増えるため、
      // 既定は「すべての時間帯を選べる」状態にしておく。
      availableTimeSlots: prev.availableTimeSlotsTouched
        ? prev.availableTimeSlots
        : isFreshZone(value)
          ? [...AVAILABLE_TIME_SLOT_VALUES]
          : [],
    }));
  };

  const handleRequiresSchedulingToggle = (_event: ChangeEvent<HTMLInputElement>, checked: boolean) => {
    setFulfillment((prev) => ({ ...prev, requiresScheduling: checked, requiresSchedulingTouched: true }));
  };

  const handleWeekdayToggle = (day: number) => (_event: ChangeEvent<HTMLInputElement>, checked: boolean) => {
    setFulfillment((prev) => ({
      ...prev,
      shippableWeekdays: checked
        ? Array.from(new Set([...prev.shippableWeekdays, day]))
        : prev.shippableWeekdays.filter((entry) => entry !== day),
    }));
  };

  const handleTimeSlotToggle = (slot: string) => (_event: ChangeEvent<HTMLInputElement>, checked: boolean) => {
    setFulfillment((prev) => ({
      ...prev,
      availableTimeSlotsTouched: true,
      availableTimeSlots: checked
        ? AVAILABLE_TIME_SLOT_VALUES.filter((entry) => [...prev.availableTimeSlots, slot].includes(entry))
        : prev.availableTimeSlots.filter((entry) => entry !== slot),
    }));
  };

  const handleDeliveryToggle = (method: string) => (_event: ChangeEvent<HTMLInputElement>, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      deliveryMethods: checked
        ? Array.from(new Set([...prev.deliveryMethods, method]))
        : prev.deliveryMethods.filter((entry) => entry !== method),
    }));
  };

  const handleImageChange = (target: ImageTarget) => async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setError(null);
    setImageErrorByTarget((prev) => ({ ...prev, [target]: null }));

    if (file.size > MAX_IMAGE_BYTES) {
      setImageErrorByTarget((prev) => ({ ...prev, [target]: IMAGE_TOO_LARGE_MESSAGE }));
      return;
    }

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
      setImageErrorByTarget((prev) => ({
        ...prev,
        [target]: err instanceof Error ? err.message : "画像のアップロードに失敗しました。",
      }));
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
        // 「見出し」項目は廃止したため、商品・サービス名を見出しとして保存する。
        heading: form.merchandiseName,
        merchandiseName: form.merchandiseName,
        serviceDescription: form.serviceDescription,
        priceYen: Number(form.priceYen),
        deliveryMethods: form.deliveryMethods as MerchandiseFormPayload["deliveryMethods"],
        serviceArea: form.serviceArea,
        genre: form.genre,
        genreOther: form.genre === "その他" ? form.genreOther : undefined,
        cardImage:
          cardImage.s3Key && cardImage.contentType
            ? { s3Key: cardImage.s3Key, contentType: cardImage.contentType }
            : undefined,
        detailImage:
          detailImage.s3Key && detailImage.contentType
            ? { s3Key: detailImage.s3Key, contentType: detailImage.contentType }
            : undefined,
        contentVolume: form.contentVolume || undefined,
        expiration: form.expiration || undefined,
        deliverySchedule: form.deliverySchedule || undefined,
        notes: form.notes || undefined,
        fulfillment: buildFulfillmentPayload(fulfillment),
        reservation: reservation.enabled
          ? {
              reservationUrl: reservation.reservationUrl.trim() || undefined,
              instructions: reservation.instructions.trim() || undefined,
            }
          : undefined,
      };

      if (mode === "create") {
        await createMerchandise(payload);
        router.push("/merchandise");
        router.refresh();
      } else if (initial) {
        await updateMerchandise(initial.merchandiseId, payload);
        router.push("/merchandise");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  // 入力した設定で実際にどのお届け日が提示されるかを、保存前に確認できるようにする。
  // 日付の計算はサーバー側だけで行い、ここでは返ってきた文字列を表示するだけにする。
  const schedulePreviewKey = fulfillment.requiresScheduling
    ? JSON.stringify(buildFulfillmentPayload(fulfillment))
    : null;

  useEffect(() => {
    if (!schedulePreviewKey) {
      setPreview(null);
      setPreviewError(null);
      return;
    }

    const controller = new AbortController();
    // 入力のたびに叩かないよう、手が止まってから問い合わせる
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const result = await fetchSchedulePreview(
          JSON.parse(schedulePreviewKey) as ProductFulfillment,
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setPreview(result);
        }
      } catch (err) {
        if (controller.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }
        setPreviewError(err instanceof Error ? err.message : "お届け日の確認に失敗しました。");
      } finally {
        if (!controller.signal.aborted) {
          setPreviewLoading(false);
        }
      }
    }, 600);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [schedulePreviewKey]);

  const previewTitle = useMemo(() => form.merchandiseName || "商品名", [form.merchandiseName]);
  // 履歴は古い順に追記されるため、新しい操作が上に来るよう反転して表示する。
  const historyEvents = useMemo(() => [...(initial?.history ?? [])].reverse(), [initial?.history]);

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        title={mode === "create" ? "商品・サービス 新規登録" : "商品・サービス 編集"}
        adminName={merchantName}
        merchantDisplayName={merchantDisplayName ?? merchantCompanyName}
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
              label="必要ポイント数（自動算出: 価格÷5）"
              fullWidth
              value={autoRequiredPoint > 0 ? autoRequiredPoint.toLocaleString("ja-JP") : ""}
              slotProps={{
                input: {
                  readOnly: true,
                  endAdornment: <InputAdornment position="end">pt</InputAdornment>,
                },
                inputLabel: { shrink: true },
              }}
              placeholder="価格を入力すると自動で算出されます"
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
          <TextField
            label="商品コード（登録時に自動採番）"
            fullWidth
            value={initial?.productCode ?? ""}
            slotProps={{
              input: { readOnly: true },
              inputLabel: { shrink: true },
            }}
            placeholder={mode === "create" ? "登録後に自動で採番されます" : ""}
            helperText={mode === "create" ? "登録時に商品コードが自動付与されます。" : undefined}
          />
          <TextField
            label="内容量"
            fullWidth
            value={form.contentVolume}
            onChange={handleField("contentVolume")}
            placeholder="6個入り（個包装） など"
          />
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
          配送・日程調整
        </Typography>
        <Typography variant="body2" className="!mt-1 text-slate-500">
          生鮮品など、お届け日の調整が必要な商品はここで設定します。日程調整を有効にすると、受け渡し方法や温度帯などの詳細を設定できます。
        </Typography>

        <Stack spacing={2.5} className="!mt-4">
          <FormControlLabel
            control={<Switch checked={fulfillment.requiresScheduling} onChange={handleRequiresSchedulingToggle} />}
            label="お届け日の日程調整を行う（交換申請後に候補日を提示して、申請者に選んでもらいます）"
          />

          {fulfillment.requiresScheduling ? (
            <>
              {/* 受け渡し方法・温度帯も日程調整の設定の一部なので、トグル ON のときだけ表示する */}
              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  select
                  label="受け渡し方法"
                  fullWidth
                  value={fulfillment.fulfillmentType}
                  onChange={(event) =>
                    setFulfillment((prev) => ({ ...prev, fulfillmentType: event.target.value as FulfillmentType }))
                  }
                >
                  {fulfillmentTypeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="温度帯"
                  fullWidth
                  value={fulfillment.temperatureZone}
                  onChange={handleTemperatureZoneChange}
                >
                  {temperatureZoneOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </div>

              {/* 設問は MUI のラベルに入れると折り返されず省略表示になるため、
                  項目の上に本文として置き、入力欄はラベルなしにする。 */}
              <div className="space-y-4">
                {[
                  {
                    key: "leadTimeBusinessDays" as const,
                    question: "お届け日が決まってから、発送するまで何日かかりますか？",
                    help: "お休みの日は数えません。当日発送できるなら 0 日です",
                    type: "number",
                    unit: "日",
                  },
                  {
                    key: "transitDays" as const,
                    question: "発送してから、お届け先に届くまで何日かかりますか？",
                    help: "一番時間がかかる地域に合わせてください（翌日届くなら 1 日）",
                    type: "number",
                    unit: "日",
                  },
                  {
                    key: "cutoffTime" as const,
                    question: "その日のうちに発送するには、何時までに決まっている必要がありますか？",
                    help: "宅配便の集荷時間に合わせてください",
                    type: "time",
                    unit: undefined,
                  },
                ].map((field) => (
                  <div key={field.key}>
                    <Typography variant="body2" className="!mb-1.5 font-semibold text-slate-800">
                      {field.question}
                    </Typography>
                    <TextField
                      type={field.type}
                      size="small"
                      value={fulfillment[field.key]}
                      onChange={handleFulfillmentField(field.key)}
                      className="!w-56"
                      slotProps={
                        field.unit
                          ? { input: { endAdornment: <InputAdornment position="end">{field.unit}</InputAdornment> } }
                          : undefined
                      }
                    />
                    {/* 補足は入力欄の幅で折り返さないよう、helperText ではなく外に置く */}
                    <Typography variant="caption" className="!mt-1 block text-slate-500">
                      {field.help}
                    </Typography>
                  </div>
                ))}
              </div>

              <FormControl className="rounded-2xl border border-slate-200 px-4 py-4">
                <Typography variant="subtitle2" className="text-slate-800">
                  発送できる曜日はどれですか？
                </Typography>
                <Typography variant="caption" className="text-slate-500">
                  製造や梱包の都合で発送できる曜日だけを選んでください。
                </Typography>
                <FormGroup row className="mt-2">
                  {weekdayLabels.map((label, day) => (
                    <FormControlLabel
                      key={day}
                      control={
                        <Checkbox
                          size="small"
                          checked={fulfillment.shippableWeekdays.includes(day)}
                          onChange={handleWeekdayToggle(day)}
                        />
                      }
                      label={label}
                    />
                  ))}
                </FormGroup>
              </FormControl>

              <FormControl className="rounded-2xl border border-slate-200 px-4 py-4">
                <Typography variant="subtitle2" className="text-slate-800">
                  申請者が選べる時間帯（任意）
                </Typography>
                <Typography variant="caption" className="text-slate-500">
                  受け取れる時間を指定できると、不在で受け取れない失敗が減ります。
                </Typography>
                <FormGroup row className="mt-2">
                  {AVAILABLE_TIME_SLOT_VALUES.map((slot) => (
                    <FormControlLabel
                      key={slot}
                      control={
                        <Checkbox
                          size="small"
                          checked={fulfillment.availableTimeSlots.includes(slot)}
                          onChange={handleTimeSlotToggle(slot)}
                        />
                      }
                      label={slot}
                    />
                  ))}
                </FormGroup>
              </FormControl>

              <div>
                <Typography variant="body2" className="!mb-1.5 font-semibold text-slate-800">
                  申請者に見せる候補日は何件にしますか？
                </Typography>
                <TextField
                  type="number"
                  size="small"
                  value={fulfillment.candidateCount}
                  onChange={handleFulfillmentField("candidateCount")}
                  className="!w-56"
                  slotProps={{ input: { endAdornment: <InputAdornment position="end">件</InputAdornment> } }}
                />
                <Typography variant="caption" className="!mt-1 block text-slate-500">
                  迷ったら 4 件のままで問題ありません（1〜10）
                </Typography>
              </div>

              {/* 入力した数字が実際にどの日付になるのかを、保存前に確認できるようにする。
                  営業日の数え方を理解していなくても、出てくる日付を見れば妥当性を判断できる。 */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-4">
                <Typography variant="subtitle2" className="text-emerald-900">
                  この設定だと、こうなります
                </Typography>
                <Typography variant="caption" className="text-emerald-800">
                  今日この商品に交換申請があった場合に、申請者へ提示されるお届け日です。
                </Typography>

                {previewError ? (
                  <Typography variant="body2" className="!mt-3 text-rose-700">
                    {previewError}
                  </Typography>
                ) : previewLoading && !preview ? (
                  <Typography variant="body2" className="!mt-3 text-emerald-900">
                    確認しています...
                  </Typography>
                ) : preview && preview.candidates.length > 0 ? (
                  <>
                    <ul className="mt-3 space-y-1.5">
                      {preview.candidates.map((candidate) => (
                        <li key={candidate.arrivalLabel} className="text-sm text-emerald-950">
                          <span className="font-bold">{candidate.arrivalLabel} 着</span>
                          <span className="ml-2 text-xs text-emerald-800">
                            （{candidate.shipLabel} 発送・{candidate.selectableUntilLabel} まで選択可能）
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Typography variant="caption" className="!mt-2 block text-emerald-800">
                      早すぎる・遅すぎると感じたら、上の日数や曜日を調整してください。
                    </Typography>
                  </>
                ) : preview?.note ? (
                  <Typography variant="body2" className="!mt-3 text-amber-800">
                    {preview.note}
                  </Typography>
                ) : (
                  <Typography variant="body2" className="!mt-3 text-emerald-900">
                    確認しています...
                  </Typography>
                )}
              </div>

              <Alert severity="info">
                臨時休業や出張などで発送できない日は
                <a href="/calendar" className="mx-1 font-semibold underline">
                  休業日カレンダー
                </a>
                に登録しておくと、候補日の自動生成から除外されます。
              </Alert>
            </>
          ) : null}
        </Stack>
      </Paper>

      <Paper elevation={0} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <Typography variant="h6" className="font-semibold text-slate-900">
          予約のご案内（サロン・施術など）
        </Typography>
        <Typography variant="body2" className="!mt-1 text-slate-500">
          ご来店・施術に予約が必要なサービスはここで設定します。交換申請を承認すると、申請者へ予約先が自動でメール案内されます。
        </Typography>

        <Stack spacing={2.5} className="!mt-4">
          <FormControlLabel
            control={
              <Switch
                checked={reservation.enabled}
                onChange={(_event, checked) => setReservation((prev) => ({ ...prev, enabled: checked }))}
              />
            }
            label="交換承認後に、申請者自身による予約が必要（予約サイト・電話予約など）"
          />

          {reservation.enabled ? (
            <>
              <TextField
                label="予約ページURL"
                fullWidth
                type="url"
                value={reservation.reservationUrl}
                onChange={(event) =>
                  setReservation((prev) => ({ ...prev, reservationUrl: event.target.value }))
                }
                placeholder="https://beauty.hotpepper.jp/... （メニュー直リンクがおすすめ）"
                helperText="ホットペッパービューティー等の予約ページのURL。対象メニューに直接飛べるURLだと申請者が迷いません。"
              />
              <TextField
                label="予約方法・注意事項"
                fullWidth
                multiline
                minRows={3}
                value={reservation.instructions}
                onChange={(event) =>
                  setReservation((prev) => ({ ...prev, instructions: event.target.value }))
                }
                placeholder={"例）お電話（052-XXX-XXXX）でもご予約いただけます。\n予約時に備考欄へ交換番号をご記入ください。"}
                helperText="電話予約のみの場合はこちらに記載してください。URLと予約方法のどちらか一方は必須です。"
              />
              <Alert severity="info">
                申請者には、承認時のメールと交換履歴の詳細画面で「予約先」と「交換番号」を案内します。
                予約時に交換番号を伝えてもらう運用のため、ご来店時に交換番号を確認し、
                サービス提供が済んだらこの画面の交換管理から「完了」へ進めてください。
              </Alert>
            </>
          ) : null}
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
            const imageError = imageErrorByTarget[target];

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
                {imageError ? (
                  <Typography variant="body2" className="!mt-2 text-rose-600">
                    {imageError}
                  </Typography>
                ) : null}
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

      {/* 誰がいつこの商品を登録・編集・公開状態変更したかを、後から追えるように表示する。 */}
      {mode === "edit" && initial ? (
        <Paper elevation={0} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <Typography variant="h6" className="font-semibold text-slate-900">
            操作履歴
          </Typography>
          <Typography variant="body2" className="!mt-1 text-slate-500">
            この商品・サービスを操作した担当者と日時です。
          </Typography>

          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <dt className="text-xs font-semibold text-slate-500">登録</dt>
              <dd className="mt-1 text-slate-900">{formatMerchandiseActor(initial.createdBy)}</dd>
              <dd className="mt-0.5 text-xs text-slate-500">{formatMerchandiseDateTime(initial.createdAt)}</dd>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <dt className="text-xs font-semibold text-slate-500">最終更新</dt>
              <dd className="mt-1 text-slate-900">{formatMerchandiseActor(initial.updatedBy)}</dd>
              <dd className="mt-0.5 text-xs text-slate-500">{formatMerchandiseDateTime(initial.updatedAt)}</dd>
            </div>
          </dl>

          {historyEvents.length === 0 ? (
            <Typography variant="body2" className="!mt-4 text-slate-500">
              この機能の追加より前に登録された商品のため、詳細な操作履歴は残っていません。
            </Typography>
          ) : (
            <ol className="mt-4 space-y-2">
              {historyEvents.map((event, index) => (
                <li
                  key={`${event.occurredAt}-${index}`}
                  className="flex flex-col gap-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <span className="font-semibold text-slate-900">{formatMerchandiseHistoryLabel(event)}</span>
                    <span className="ml-3 text-slate-700">{formatMerchandiseActor(event.actor)}</span>
                  </div>
                  <div className="text-xs text-slate-500">{formatMerchandiseDateTime(event.occurredAt)}</div>
                </li>
              ))}
            </ol>
          )}
        </Paper>
      ) : null}

      {/* エラーはページ上部にも出すが、押下直後に視線があるボタン付近にも表示して
          「押したのに登録されない」状態に気づけるようにする。 */}
      {error ? <Alert severity="error">{error}</Alert> : null}

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
          merchandiseName={form.merchandiseName}
          serviceDescription={form.serviceDescription}
          priceYen={Number(form.priceYen)}
          requiredPoint={autoRequiredPoint}
          deliveryMethods={form.deliveryMethods}
          serviceArea={form.serviceArea}
          genre={form.genre}
          genreOther={form.genreOther}
          cardImagePreviewUrl={cardImage.previewUrl}
          detailImagePreviewUrl={detailImage.previewUrl}
          merchantCompanyName={merchantCompanyName}
          contentVolume={form.contentVolume}
          expiration={form.expiration}
          deliverySchedule={form.deliverySchedule}
          notes={form.notes}
          reservationEnabled={reservation.enabled}
        />
      </div>
    </div>
  );
}
