import "server-only";

import { randomUUID } from "node:crypto";

import {
  buildMerchandiseByStatusGsiPk,
  buildMerchandiseByStatusGsiSk,
  buildMerchandiseSk,
  getMerchandise,
  listMerchandiseByMerchant,
  putMerchandise,
  updateMerchandiseStatus,
} from "@correcre/lib/dynamodb/merchandise";
import { getMerchantById } from "@correcre/lib/dynamodb/merchant";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import {
  buildMerchandiseDraftImageKey,
  buildMerchandiseFinalImageKey,
  createMerchandiseImageUploadUrl,
  createMerchandiseImageViewUrl,
  getExtensionFromKey,
  isMerchandiseAllowedImageContentType,
  isMerchandiseDraftImageKey,
  isMerchandiseImageKeyForMerchant,
  MERCHANDISE_MAX_IMAGE_BYTES,
  promoteMerchandiseDraftImage,
  type MerchandiseImageTarget,
} from "@correcre/lib/s3/merchandise-image";
import type {
  Merchandise,
  MerchandiseDeliveryMethod,
  MerchandiseGenre,
  MerchandiseImageRef,
  MerchandiseStatus,
  MerchandiseTag,
} from "@correcre/types";
import { MERCHANDISE_TAG_VALUES } from "@correcre/types";

import type {
  CreateMerchandiseRequest,
  MerchandiseFormPayload,
  MerchandiseSummary,
  RequestUploadUrlResponse,
  RequestViewUrlResponse,
  UpdateMerchandiseRequest,
} from "../model/types";

type RuntimeConfig = {
  region: string;
  merchandiseTableName: string;
  merchantTableName: string;
  merchandiseImageBucketName: string;
};

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

  return merchant?.name ?? null;
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

  if (!Number.isFinite(input.requiredPoint) || input.requiredPoint <= 0) {
    throw new Error("必要ポイント数は正の数で入力してください");
  }

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

  const tags = (input.tags ?? []).filter((tag): tag is MerchandiseTag =>
    MERCHANDISE_TAG_VALUES.includes(tag),
  );
  const uniqueTags = Array.from(new Set(tags));

  const productCode = input.productCode?.trim() || undefined;
  const contentVolume = input.contentVolume?.trim() || undefined;
  const expiration = input.expiration?.trim() || undefined;
  const deliverySchedule = input.deliverySchedule?.trim() || undefined;
  const notes = input.notes?.trim() || undefined;

  return {
    heading,
    merchandiseName,
    serviceDescription,
    priceYen: Math.floor(input.priceYen),
    requiredPoint: Math.floor(input.requiredPoint),
    deliveryMethods,
    serviceArea,
    genre: input.genre,
    genreOther,
    publishDate: input.publishDate?.trim() || undefined,
    tags: uniqueTags.length > 0 ? uniqueTags : undefined,
    productCode,
    contentVolume,
    expiration,
    deliverySchedule,
    notes,
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
  const status: MerchandiseStatus = "DRAFT";

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
    publishDate: normalized.publishDate,
    tags: normalized.tags,
    productCode: normalized.productCode,
    contentVolume: normalized.contentVolume,
    expiration: normalized.expiration,
    deliverySchedule: normalized.deliverySchedule,
    notes: normalized.notes,
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
  );

  return buildMerchandiseSummary(config, item);
}

export async function updateMerchandiseForMerchant(
  merchantId: string,
  merchandiseId: string,
  input: UpdateMerchandiseRequest,
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
    publishDate: normalized.publishDate,
    tags: normalized.tags,
    productCode: normalized.productCode,
    contentVolume: normalized.contentVolume,
    expiration: normalized.expiration,
    deliverySchedule: normalized.deliverySchedule,
    notes: normalized.notes,
    cardImage,
    detailImage,
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

  await updateMerchandiseStatus(
    {
      region: config.region,
      tableName: config.merchandiseTableName,
    },
    merchantId,
    merchandiseId,
    status,
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

  return buildMerchandiseSummary(config, refreshed);
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
