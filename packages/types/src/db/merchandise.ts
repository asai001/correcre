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

// 商品を操作した提携企業ユーザー。表示名はスナップショット（後で改名・削除されても履歴が読める）。
export type MerchandiseAuditActor = {
  userId: string;
  name?: string;
  email?: string;
};

export type MerchandiseHistoryAction = "CREATED" | "UPDATED" | "STATUS_CHANGED";

export type MerchandiseHistoryEvent = {
  action: MerchandiseHistoryAction;
  occurredAt: string;
  // STATUS_CHANGED のときの遷移先。CREATED では初期ステータス。
  status?: MerchandiseStatus;
  actor?: MerchandiseAuditActor;
};

// 1 レコードが肥大化しないよう、保持する操作履歴の上限件数（超えた分は古いものから捨てる）。
export const MERCHANDISE_HISTORY_MAX_ENTRIES = 50;

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

  favoriteCount?: number;

  // 操作者の追跡用。既存レコードには存在しないため任意。
  createdBy?: MerchandiseAuditActor;
  updatedBy?: MerchandiseAuditActor;
  history?: MerchandiseHistoryEvent[];

  createdAt: string;
  updatedAt: string;

  gsi1pk: `STATUS#${MerchandiseStatus}`;
  gsi1sk: `MERCHANT#${string}#MERCHANDISE#${string}`;
};
