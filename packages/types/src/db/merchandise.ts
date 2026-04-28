export type MerchandiseStatus = "DRAFT" | "PUBLISHED" | "UNPUBLISHED";

export type MerchandiseDeliveryMethod = "来店" | "出張" | "発送" | "オンライン";

export type MerchandiseGenre = "健康・美容" | "日用品・生活雑貨" | "服飾" | "記念" | "食品" | "その他";

export type MerchandiseTag = "人気" | "新着" | "限定" | "予約制" | "相談可" | "定番" | "注目";

export const MERCHANDISE_TAG_VALUES: readonly MerchandiseTag[] = [
  "人気",
  "新着",
  "限定",
  "予約制",
  "相談可",
  "定番",
  "注目",
];

export type MerchandiseImageRef = {
  s3Key: string;
  contentType: string;
  uploadedAt: string;
};

export type Merchandise = {
  merchantId: string;
  sk: `MERCHANDISE#${string}`;
  merchandiseId: string;

  status: MerchandiseStatus;

  heading: string;
  merchandiseName: string;
  serviceDescription: string;

  priceYen: number;
  requiredPoint: number;

  deliveryMethods: MerchandiseDeliveryMethod[];
  serviceArea: string;

  genre: MerchandiseGenre;
  genreOther?: string;

  cardImage?: MerchandiseImageRef;
  detailImage?: MerchandiseImageRef;

  publishDate?: string;
  publishedAt?: string;

  tags?: MerchandiseTag[];
  productCode?: string;
  contentVolume?: string;
  expiration?: string;
  deliverySchedule?: string;
  notes?: string;

  createdAt: string;
  updatedAt: string;

  gsi1pk: `STATUS#${MerchandiseStatus}`;
  gsi1sk: `MERCHANT#${string}#MERCHANDISE#${string}`;
};
