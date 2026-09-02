import "server-only";

import { randomUUID } from "node:crypto";

import { deleteFavoritesByMerchandise } from "@correcre/lib/dynamodb/exchange-favorite";
import { listExchangeHistoryByMerchantAndStatus } from "@correcre/lib/dynamodb/exchange-history";
import {
  appendMerchandiseHistory,
  buildMerchandiseByStatusGsiPk,
  buildMerchandiseByStatusGsiSk,
  buildMerchandiseSk,
  deleteMerchandise,
  getMerchandise,
  listMerchandiseByMerchant,
  putMerchandise,
  updateMerchandiseStatus,
} from "@correcre/lib/dynamodb/merchandise";
import { getMerchantById } from "@correcre/lib/dynamodb/merchant";
import { getMerchantCalendar } from "@correcre/lib/dynamodb/merchant-calendar";
import { formatWeekdayJa } from "@correcre/lib/date/business-days";
import { generateCandidates } from "@correcre/lib/schedule/engine";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { joinNameParts } from "@correcre/lib/user-profile";
import {
  sendOperatorMerchandiseCreatedEmail,
  sendOperatorMerchandisePublishedEmail,
} from "@correcre/lib/notification/merchant-events";
import {
  buildMerchandiseDraftImageKey,
  buildMerchandiseFinalImageKey,
  createMerchandiseImageUploadUrl,
  createMerchandiseImageViewUrl,
  deleteMerchandiseImage,
  getExtensionFromKey,
  isMerchandiseAllowedImageContentType,
  isMerchandiseDraftImageKey,
  isMerchandiseImageKeyForMerchant,
  MERCHANDISE_MAX_IMAGE_BYTES,
  promoteMerchandiseDraftImage,
  type MerchandiseImageTarget,
} from "@correcre/lib/s3/merchandise-image";
import type {
  FulfillmentType,
  Merchant,
  Merchandise,
  MerchandiseAuditActor,
  MerchandiseDeliveryMethod,
  MerchandiseGenre,
  MerchandiseImageRef,
  MerchandiseReservation,
  MerchandiseStatus,
  MerchantUserItem,
  ProductFulfillment,
  TemperatureZone,
} from "@correcre/types";
import { AVAILABLE_TIME_SLOT_VALUES, DEFAULT_CANDIDATE_COUNT } from "@correcre/types";

import type {
  CreateMerchandiseRequest,
  MerchandiseFormPayload,
  MerchandiseSummary,
  RequestUploadUrlResponse,
  RequestViewUrlResponse,
  SchedulePreviewResponse,
  UpdateMerchandiseRequest,
} from "../model/types";

type RuntimeConfig = {
  region: string;
  merchandiseTableName: string;
  merchantTableName: string;
  merchandiseImageBucketName: string;
  exchangeHistoryTableName: string;
  exchangeFavoriteTableName: string;
};

export class MerchandiseHasActiveExchangesError extends Error {
  constructor(public readonly activeCount: number) {
    super("Merchandise has active exchanges");
    this.name = "MerchandiseHasActiveExchangesError";
  }
}

// 商品を操作したログイン中ユーザーを、履歴に残す形へ変換する。
// 表示名はスナップショットとして保存し、後で改名・削除されても「誰が操作したか」を追えるようにする。
export function toMerchandiseAuditActor(user: MerchantUserItem): MerchandiseAuditActor {
  return {
    userId: user.userId,
    name: joinNameParts(user.lastName, user.firstName) || undefined,
    email: user.email,
  };
}

const ALLOWED_DELIVERY_METHODS: readonly MerchandiseDeliveryMethod[] = [
  "来店",
  "出張",
  "発送",
  "オンライン",
];

const ALLOWED_GENRES: readonly MerchandiseGenre[] = [
  "健康・美容",
  "日用品・生活雑貨",
  "服飾",
  "記念",
  "食品",
  "その他",
];

function getRuntimeConfig(): RuntimeConfig {
  return {
    region: readRequiredServerEnv("AWS_REGION"),
    merchandiseTableName: readRequiredServerEnv("DDB_MERCHANDISE_TABLE_NAME"),
    merchantTableName: readRequiredServerEnv("DDB_MERCHANT_TABLE_NAME"),
    merchandiseImageBucketName: readRequiredServerEnv("S3_MERCHANDISE_IMAGE_BUCKET_NAME"),
    exchangeHistoryTableName: readRequiredServerEnv("DDB_EXCHANGE_HISTORY_TABLE_NAME"),
    exchangeFavoriteTableName: readRequiredServerEnv("DDB_EXCHANGE_FAVORITE_TABLE_NAME"),
  };
}

export async function getMerchantCompanyName(merchantId: string): Promise<string | null> {
  const config = getRuntimeConfig();
  const merchant = await getMerchantById(
    {
      region: config.region,
      tableName: config.merchantTableName,
    },
    merchantId,
  );

  return (merchant?.displayName?.trim() || merchant?.name) ?? null;
}

async function getMerchantNotificationInfo(
  config: RuntimeConfig,
  merchantId: string,
): Promise<Pick<Merchant, "merchantId" | "name" | "displayName">> {
  const merchant = await getMerchantById(
    {
      region: config.region,
      tableName: config.merchantTableName,
    },
    merchantId,
  );

  return merchant ?? { merchantId, name: merchantId };
}

async function notifyOperatorMerchandiseCreated(params: {
  config: RuntimeConfig;
  merchantId: string;
  merchandise: Merchandise;
  occurredAt: string;
}) {
  const merchant = await getMerchantNotificationInfo(params.config, params.merchantId);

  await sendOperatorMerchandiseCreatedEmail({
    region: params.config.region,
    merchant,
    merchandise: params.merchandise,
    occurredAt: params.occurredAt,
  });
}

async function notifyOperatorMerchandisePublished(params: {
  config: RuntimeConfig;
  merchantId: string;
  merchandise: Merchandise;
  occurredAt: string;
}) {
  const merchant = await getMerchantNotificationInfo(params.config, params.merchantId);

  await sendOperatorMerchandisePublishedEmail({
    region: params.config.region,
    merchant,
    merchandise: params.merchandise,
    occurredAt: params.occurredAt,
  });
}

function getNextMerchandiseId(items: Merchandise[]) {
  const nextNumber =
    items.reduce((max, item) => {
      const match = /^md-(\d+)$/.exec(item.merchandiseId);
      if (!match) return max;
      return Math.max(max, Number(match[1]));
    }, 0) + 1;

  return `md-${String(nextNumber).padStart(3, "0")}`;
}

const ALLOWED_FULFILLMENT_TYPES: FulfillmentType[] = ["SHIPPING", "STORE_PICKUP"];
const ALLOWED_TEMPERATURE_ZONES: TemperatureZone[] = ["AMBIENT", "REFRIGERATED", "FROZEN"];
const CUTOFF_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function normalizeFulfillment(input: ProductFulfillment | undefined): ProductFulfillment | undefined {
  if (!input) {
    return undefined;
  }

  if (!ALLOWED_FULFILLMENT_TYPES.includes(input.fulfillmentType)) {
    throw new Error("受け渡し方法が不正です");
  }

  if (!ALLOWED_TEMPERATURE_ZONES.includes(input.temperatureZone)) {
    throw new Error("温度帯が不正です");
  }

  const requiresScheduling = input.requiresScheduling === true;

  const leadTimeBusinessDays = Math.floor(Number(input.leadTimeBusinessDays));
  if (!Number.isFinite(leadTimeBusinessDays) || leadTimeBusinessDays < 0 || leadTimeBusinessDays > 30) {
    throw new Error("発送準備の営業日数は 0〜30 で入力してください");
  }

  const transitDays = Math.floor(Number(input.transitDays));
  if (!Number.isFinite(transitDays) || transitDays < 0 || transitDays > 14) {
    throw new Error("配送日数は 0〜14 で入力してください");
  }

  const shippableWeekdays = Array.from(
    new Set((input.shippableWeekdays ?? []).map((day) => Math.floor(Number(day)))),
  )
    .filter((day) => day >= 0 && day <= 6)
    .sort((a, b) => a - b);

  if (requiresScheduling && shippableWeekdays.length === 0) {
    throw new Error("発送できる曜日を1つ以上選んでください");
  }

  if (!CUTOFF_TIME_PATTERN.test(input.cutoffTime)) {
    throw new Error("受付締切時刻は HH:mm 形式で入力してください");
  }

  const availableTimeSlots = (input.availableTimeSlots ?? []).filter((slot) =>
    AVAILABLE_TIME_SLOT_VALUES.includes(slot),
  );

  const candidateCount = Math.floor(Number(input.candidateCount));
  if (!Number.isFinite(candidateCount) || candidateCount < 1 || candidateCount > 10) {
    throw new Error("候補日の件数は 1〜10 で入力してください");
  }

  return {
    fulfillmentType: input.fulfillmentType,
    temperatureZone: input.temperatureZone,
    requiresScheduling,
    leadTimeBusinessDays,
    transitDays,
    shippableWeekdays,
    cutoffTime: input.cutoffTime,
    availableTimeSlots,
    candidateCount: candidateCount || DEFAULT_CANDIDATE_COUNT,
  };
}

const RESERVATION_URL_MAX_LENGTH = 2048;
const RESERVATION_INSTRUCTIONS_MAX_LENGTH = 1000;

// 予約案内の設定。オブジェクト自体が無い場合は「予約不要」の商品として扱う。
function normalizeReservation(
  input: MerchandiseReservation | undefined,
): MerchandiseReservation | undefined {
  if (!input) {
    return undefined;
  }

  const reservationUrl = input.reservationUrl?.trim() || undefined;
  const instructions = input.instructions?.trim() || undefined;

  if (!reservationUrl && !instructions) {
    throw new Error("予約ページURLまたは予約方法のどちらかを入力してください");
  }

  if (reservationUrl) {
    if (reservationUrl.length > RESERVATION_URL_MAX_LENGTH) {
      throw new Error("予約ページURLが長すぎます");
    }

    let parsed: URL;
    try {
      parsed = new URL(reservationUrl);
    } catch {
      throw new Error("予約ページURLの形式が正しくありません（https:// から入力してください）");
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("予約ページURLは http(s) の URL を入力してください");
    }
  }

  if (instructions && instructions.length > RESERVATION_INSTRUCTIONS_MAX_LENGTH) {
    throw new Error(`予約方法は ${RESERVATION_INSTRUCTIONS_MAX_LENGTH} 文字以内で入力してください`);
  }

  return { reservationUrl, instructions };
}

// "YYYY-MM-DD" を「9月4日(金)」形式にする
function formatDateLabel(date: string): string {
  const [, month, day] = date.split("-").map(Number);
  return `${month}月${day}日(${formatWeekdayJa(date)})`;
}

// ISO8601（UTC）を JST の「9月2日(水) 12:00」形式にする
function formatDeadlineLabel(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const ymd = `${get("year")}-${get("month")}-${get("day")}`;
  return `${formatDateLabel(ymd)} ${get("hour")}:${get("minute")}`;
}

/**
 * 入力中の配送設定で、実際に従業員へ提示される候補日を返す。
 * 設定を保存する前に結果を確認できるようにするためのもので、
 * 日付の計算・表記はすべてここ（サーバー側）で行う。
 */
export async function previewScheduleForMerchandise(
  merchantId: string,
  input: ProductFulfillment,
): Promise<SchedulePreviewResponse> {
  const config = getRuntimeConfig();

  // 入力途中で曜日が空になるのは普通の状態なので、検証エラーにせず案内に留める
  if (!input.shippableWeekdays || input.shippableWeekdays.length === 0) {
    return { candidates: [], note: "発送できる曜日を1つ以上選ぶと、お届け日の候補が表示されます。" };
  }

  const fulfillment = normalizeFulfillment(input);

  if (!fulfillment) {
    return { candidates: [], note: "配送の設定を入力してください。" };
  }

  const calendar = await getMerchantCalendar(
    {
      region: config.region,
      tableName: readRequiredServerEnv("DDB_MERCHANT_CALENDAR_TABLE_NAME"),
    },
    merchantId,
  );

  const candidates = generateCandidates(new Date(), fulfillment, calendar);

  if (candidates.length === 0) {
    return {
      candidates: [],
      note: "この設定では、当面のお届け日の候補が作れません。発送できる曜日や休業日の登録を見直してください。",
    };
  }

  return {
    candidates: candidates.map((candidate) => ({
      arrivalLabel: formatDateLabel(candidate.arrivalDate),
      shipLabel: formatDateLabel(candidate.shipDate),
      selectableUntilLabel: formatDeadlineLabel(candidate.selectableUntil),
    })),
  };
}

function normalizeFormPayload(input: MerchandiseFormPayload) {
  const heading = input.heading.trim();
  const merchandiseName = input.merchandiseName.trim();
  const serviceDescription = input.serviceDescription.trim();
  const serviceArea = input.serviceArea.trim();

  if (!heading || !merchandiseName || !serviceDescription || !serviceArea) {
    throw new Error("商品の必須項目を入力してください");
  }

  if (!Number.isFinite(input.priceYen) || input.priceYen <= 0) {
    throw new Error("価格は正の数で入力してください");
  }

  const priceYen = Math.floor(input.priceYen);
  const requiredPoint = Math.ceil(priceYen / 5);

  const deliveryMethods = (input.deliveryMethods ?? []).filter((method): method is MerchandiseDeliveryMethod =>
    ALLOWED_DELIVERY_METHODS.includes(method),
  );

  if (deliveryMethods.length === 0) {
    throw new Error("提供方法を1つ以上選択してください");
  }

  if (!ALLOWED_GENRES.includes(input.genre)) {
    throw new Error("ジャンルが不正です");
  }

  const genreOther = input.genre === "その他" ? input.genreOther?.trim() : undefined;

  if (input.genre === "その他" && !genreOther) {
    throw new Error("ジャンル（その他）を入力してください");
  }

  const contentVolume = input.contentVolume?.trim() || undefined;
  const expiration = input.expiration?.trim() || undefined;
  const deliverySchedule = input.deliverySchedule?.trim() || undefined;
  const notes = input.notes?.trim() || undefined;
  const fulfillment = normalizeFulfillment(input.fulfillment);
  const reservation = normalizeReservation(input.reservation);

  return {
    heading,
    merchandiseName,
    serviceDescription,
    priceYen,
    requiredPoint,
    deliveryMethods,
    serviceArea,
    genre: input.genre,
    genreOther,
    contentVolume,
    expiration,
    deliverySchedule,
    notes,
    fulfillment,
    reservation,
  };
}

async function buildMerchandiseSummary(
  config: RuntimeConfig,
  item: Merchandise,
): Promise<MerchandiseSummary> {
  const summary: MerchandiseSummary = { ...item };

  if (item.cardImage) {
    const { url } = await createMerchandiseImageViewUrl(
      {
        region: config.region,
        bucketName: config.merchandiseImageBucketName,
      },
      item.cardImage.s3Key,
    );
    summary.cardImageViewUrl = url;
  }

  if (item.detailImage) {
    const { url } = await createMerchandiseImageViewUrl(
      {
        region: config.region,
        bucketName: config.merchandiseImageBucketName,
      },
      item.detailImage.s3Key,
    );
    summary.detailImageViewUrl = url;
  }

  return summary;
}

async function resolveImage(
  config: RuntimeConfig,
  merchantId: string,
  merchandiseId: string,
  target: MerchandiseImageTarget,
  draft: { s3Key: string; contentType: string } | undefined,
  existing: MerchandiseImageRef | undefined,
): Promise<MerchandiseImageRef | undefined> {
  if (!draft) {
    return existing;
  }

  if (!isMerchandiseImageKeyForMerchant(draft.s3Key, merchantId)) {
    throw new Error("画像のキーが不正です");
  }

  if (!isMerchandiseDraftImageKey(draft.s3Key)) {
    return existing;
  }

  const extension = getExtensionFromKey(draft.s3Key);
  const finalKey = buildMerchandiseFinalImageKey({
    merchantId,
    merchandiseId,
    target,
    extension,
  });

  await promoteMerchandiseDraftImage(
    {
      region: config.region,
      bucketName: config.merchandiseImageBucketName,
    },
    {
      sourceKey: draft.s3Key,
      destinationKey: finalKey,
    },
  );

  return {
    s3Key: finalKey,
    contentType: draft.contentType,
    uploadedAt: new Date().toISOString(),
  };
}

export async function listMerchandiseForMerchant(merchantId: string): Promise<MerchandiseSummary[]> {
  const config = getRuntimeConfig();
  const items = await listMerchandiseByMerchant(
    {
      region: config.region,
      tableName: config.merchandiseTableName,
    },
    merchantId,
  );

  const summaries: MerchandiseSummary[] = [];

  for (const item of items) {
    summaries.push(await buildMerchandiseSummary(config, item));
  }

  return summaries.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function getMerchandiseForMerchant(
  merchantId: string,
  merchandiseId: string,
): Promise<MerchandiseSummary | null> {
  const config = getRuntimeConfig();
  const item = await getMerchandise(
    {
      region: config.region,
      tableName: config.merchandiseTableName,
    },
    merchantId,
    merchandiseId,
  );

  if (!item) return null;

  return buildMerchandiseSummary(config, item);
}

export async function createMerchandiseForMerchant(
  merchantId: string,
  input: CreateMerchandiseRequest,
  actor?: MerchandiseAuditActor,
): Promise<MerchandiseSummary> {
  const config = getRuntimeConfig();
  const normalized = normalizeFormPayload(input);
  const existing = await listMerchandiseByMerchant(
    {
      region: config.region,
      tableName: config.merchandiseTableName,
    },
    merchantId,
  );

  const merchandiseId = getNextMerchandiseId(existing);
  const now = new Date().toISOString();
  // 登録ボタン = そのまま公開。初回登録者が「登録したのに表示されない」と迷わないよう、
  // 明示的に「下書き保存」を選んだときだけ DRAFT で作成する。
  const status: MerchandiseStatus = input.initialStatus === "DRAFT" ? "DRAFT" : "PUBLISHED";

  const cardImage = await resolveImage(config, merchantId, merchandiseId, "card", input.cardImage, undefined);
  const detailImage = await resolveImage(
    config,
    merchantId,
    merchandiseId,
    "detail",
    input.detailImage,
    undefined,
  );

  const item: Merchandise = {
    merchantId,
    sk: buildMerchandiseSk(merchandiseId),
    merchandiseId,
    status,
    heading: normalized.heading,
    merchandiseName: normalized.merchandiseName,
    serviceDescription: normalized.serviceDescription,
    priceYen: normalized.priceYen,
    requiredPoint: normalized.requiredPoint,
    deliveryMethods: normalized.deliveryMethods,
    serviceArea: normalized.serviceArea,
    genre: normalized.genre,
    genreOther: normalized.genreOther,
    cardImage,
    detailImage,
    productCode: merchandiseId,
    contentVolume: normalized.contentVolume,
    expiration: normalized.expiration,
    deliverySchedule: normalized.deliverySchedule,
    notes: normalized.notes,
    fulfillment: normalized.fulfillment,
    reservation: normalized.reservation,
    // 公開で作成する場合は掲載日・公開日時も登録時点で確定させる
    ...(status === "PUBLISHED" ? { publishDate: now.slice(0, 10), publishedAt: now } : {}),
    createdBy: actor,
    updatedBy: actor,
    history: appendMerchandiseHistory(undefined, {
      action: "CREATED",
      occurredAt: now,
      status,
      actor,
    }),
    createdAt: now,
    updatedAt: now,
    gsi1pk: buildMerchandiseByStatusGsiPk(status),
    gsi1sk: buildMerchandiseByStatusGsiSk(merchantId, merchandiseId),
  };

  await putMerchandise(
    {
      region: config.region,
      tableName: config.merchandiseTableName,
    },
    item,
    // ID 採番（最大値+1）の並行作成による他レコードの黙った上書きを防ぐ。
    { conditionExpression: "attribute_not_exists(sk)" },
  );

  // 公開で作成した場合は「公開」通知を送る（「登録」通知と二重に送らない）。
  const notifyOperator =
    status === "PUBLISHED" ? notifyOperatorMerchandisePublished : notifyOperatorMerchandiseCreated;
  await notifyOperator({
    config,
    merchantId,
    merchandise: item,
    occurredAt: now,
  }).catch((notifyError) => {
    console.error("Failed to send merchandise-created notification.", {
      error: notifyError,
      merchantId,
      merchandiseId,
    });
  });

  return buildMerchandiseSummary(config, item);
}

export async function updateMerchandiseForMerchant(
  merchantId: string,
  merchandiseId: string,
  input: UpdateMerchandiseRequest,
  actor?: MerchandiseAuditActor,
): Promise<MerchandiseSummary> {
  const config = getRuntimeConfig();
  const existing = await getMerchandise(
    {
      region: config.region,
      tableName: config.merchandiseTableName,
    },
    merchantId,
    merchandiseId,
  );

  if (!existing) {
    throw new Error("Merchandise not found");
  }

  const normalized = normalizeFormPayload(input);
  const now = new Date().toISOString();

  const cardImage = await resolveImage(
    config,
    merchantId,
    merchandiseId,
    "card",
    input.cardImage,
    existing.cardImage,
  );
  const detailImage = await resolveImage(
    config,
    merchantId,
    merchandiseId,
    "detail",
    input.detailImage,
    existing.detailImage,
  );

  const item: Merchandise = {
    ...existing,
    heading: normalized.heading,
    merchandiseName: normalized.merchandiseName,
    serviceDescription: normalized.serviceDescription,
    priceYen: normalized.priceYen,
    requiredPoint: normalized.requiredPoint,
    deliveryMethods: normalized.deliveryMethods,
    serviceArea: normalized.serviceArea,
    genre: normalized.genre,
    genreOther: normalized.genreOther,
    productCode: existing.productCode ?? merchandiseId,
    contentVolume: normalized.contentVolume,
    expiration: normalized.expiration,
    deliverySchedule: normalized.deliverySchedule,
    notes: normalized.notes,
    fulfillment: normalized.fulfillment ?? existing.fulfillment,
    // フォームは常に現在の設定を送るため、undefined は「予約不要へ変更」として保存する
    // （put 時に removeUndefinedValues で属性ごと消える）。
    reservation: normalized.reservation,
    cardImage,
    detailImage,
    updatedBy: actor ?? existing.updatedBy,
    history: appendMerchandiseHistory(existing.history, {
      action: "UPDATED",
      occurredAt: now,
      status: existing.status,
      actor,
    }),
    updatedAt: now,
  };

  await putMerchandise(
    {
      region: config.region,
      tableName: config.merchandiseTableName,
    },
    item,
  );

  return buildMerchandiseSummary(config, item);
}

export async function setMerchandiseStatusForMerchant(
  merchantId: string,
  merchandiseId: string,
  status: MerchandiseStatus,
  actor?: MerchandiseAuditActor,
): Promise<MerchandiseSummary> {
  const config = getRuntimeConfig();
  const existing = await getMerchandise(
    {
      region: config.region,
      tableName: config.merchandiseTableName,
    },
    merchantId,
    merchandiseId,
  );

  if (!existing) {
    throw new Error("Merchandise not found");
  }

  const shouldNotifyPublished = status === "PUBLISHED" && existing.status !== "PUBLISHED";
  const now = new Date().toISOString();

  await updateMerchandiseStatus(
    {
      region: config.region,
      tableName: config.merchandiseTableName,
    },
    merchantId,
    merchandiseId,
    status,
    {
      updatedAt: now,
      actor,
      history: appendMerchandiseHistory(existing.history, {
        action: "STATUS_CHANGED",
        occurredAt: now,
        status,
        actor,
      }),
    },
  );

  const refreshed = await getMerchandise(
    {
      region: config.region,
      tableName: config.merchandiseTableName,
    },
    merchantId,
    merchandiseId,
  );

  if (!refreshed) {
    throw new Error("Merchandise not found after update");
  }

  if (shouldNotifyPublished) {
    await notifyOperatorMerchandisePublished({
      config,
      merchantId,
      merchandise: refreshed,
      occurredAt: refreshed.publishedAt ?? refreshed.updatedAt,
    }).catch((notifyError) => {
      console.error("Failed to send merchandise-published notification.", {
        error: notifyError,
        merchantId,
        merchandiseId,
      });
    });
  }

  return buildMerchandiseSummary(config, refreshed);
}

const ACTIVE_EXCHANGE_STATUSES = ["REQUESTED", "PREPARING", "IN_PROGRESS"] as const;

export async function deleteMerchandiseForMerchant(
  merchantId: string,
  merchandiseId: string,
): Promise<void> {
  const config = getRuntimeConfig();
  const existing = await getMerchandise(
    {
      region: config.region,
      tableName: config.merchandiseTableName,
    },
    merchantId,
    merchandiseId,
  );

  if (!existing) {
    throw new Error("Merchandise not found");
  }

  const exchangeHistoryConfig = {
    region: config.region,
    tableName: config.exchangeHistoryTableName,
  };

  const activeExchangeLists = await Promise.all(
    ACTIVE_EXCHANGE_STATUSES.map((status) =>
      listExchangeHistoryByMerchantAndStatus(exchangeHistoryConfig, merchantId, status),
    ),
  );

  const activeCount = activeExchangeLists
    .flat()
    .filter((exchange) => exchange.merchandiseId === merchandiseId).length;

  if (activeCount > 0) {
    throw new MerchandiseHasActiveExchangesError(activeCount);
  }

  await deleteFavoritesByMerchandise(
    {
      region: config.region,
      tableName: config.exchangeFavoriteTableName,
    },
    merchantId,
    merchandiseId,
  );

  await deleteMerchandise(
    {
      region: config.region,
      tableName: config.merchandiseTableName,
    },
    merchantId,
    merchandiseId,
  );

  const imageBucketConfig = {
    region: config.region,
    bucketName: config.merchandiseImageBucketName,
  };

  if (existing.cardImage) {
    await deleteMerchandiseImage(imageBucketConfig, existing.cardImage.s3Key);
  }

  if (existing.detailImage) {
    await deleteMerchandiseImage(imageBucketConfig, existing.detailImage.s3Key);
  }
}

export async function createMerchandiseUploadUrl(
  merchantId: string,
  contentType: string,
  contentLength: number,
): Promise<RequestUploadUrlResponse> {
  const config = getRuntimeConfig();

  if (!isMerchandiseAllowedImageContentType(contentType)) {
    throw new Error("画像形式は JPEG / PNG / WebP のいずれかを指定してください");
  }

  if (!Number.isFinite(contentLength) || contentLength <= 0) {
    throw new Error("画像サイズが不正です");
  }

  if (contentLength > MERCHANDISE_MAX_IMAGE_BYTES) {
    throw new Error("画像サイズは 10 MB 以下にしてください");
  }

  const extension = contentType === "image/jpeg" ? "jpg" : contentType.replace("image/", "");
  const s3Key = buildMerchandiseDraftImageKey({
    merchantId,
    uploadId: randomUUID(),
    extension,
  });

  const { url, expiresAt } = await createMerchandiseImageUploadUrl(
    {
      region: config.region,
      bucketName: config.merchandiseImageBucketName,
    },
    {
      s3Key,
      contentType,
      contentLength,
    },
  );

  return {
    uploadUrl: url,
    s3Key,
    expiresAt,
  };
}

export async function createMerchandiseImageViewUrlForMerchant(
  merchantId: string,
  s3Key: string,
): Promise<RequestViewUrlResponse> {
  const config = getRuntimeConfig();

  if (!isMerchandiseImageKeyForMerchant(s3Key, merchantId)) {
    throw new Error("画像のキーが不正です");
  }

  const { url, expiresAt } = await createMerchandiseImageViewUrl(
    {
      region: config.region,
      bucketName: config.merchandiseImageBucketName,
    },
    s3Key,
  );

  return {
    viewUrl: url,
    expiresAt,
  };
}
