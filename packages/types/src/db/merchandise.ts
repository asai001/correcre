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

export type FulfillmentType = "SHIPPING" | "STORE_PICKUP";

export type TemperatureZone = "AMBIENT" | "REFRIGERATED" | "FROZEN";

// 配送・日程調整の設定。既存商品には存在しないため任意フィールドとし、
// 未設定は「SHIPPING / 日程調整なし」として読み取り時に解釈する（resolveMerchandiseFulfillment）。
export type ProductFulfillment = {
  fulfillmentType: FulfillmentType;
  // 冷蔵・冷凍は requiresScheduling の既定値を true にする（フォーム初期値。merchant が上書き可能）
  temperatureZone: TemperatureZone;
  requiresScheduling: boolean;
  // 日程確定から発送までに必要な営業日数（製造・梱包の準備期間）
  leadTimeBusinessDays: number;
  // 発送から到着までの日数（配送業者・エリア依存、暦日）
  transitDays: number;
  // 発送可能曜日 (0=日 ... 6=土)。製造サイクルに対応
  shippableWeekdays: number[];
  // 当日受付の締切時刻 "HH:mm" (Asia/Tokyo)
  cutoffTime: string;
  availableTimeSlots: string[];
  // 生成する候補日の件数（既定 4）
  candidateCount: number;
};

export const DEFAULT_CANDIDATE_COUNT = 4;

// 時間帯はヤマト運輸準拠のプリセットから選択させる（自由入力だと表示・集計が崩れるため）
export const AVAILABLE_TIME_SLOT_VALUES: readonly string[] = [
  "午前中",
  "14:00-16:00",
  "16:00-18:00",
  "18:00-20:00",
  "19:00-21:00",
];

// fulfillment 未設定の既存商品に適用する既定値。既存フローへの影響を避けるため日程調整なし。
export function resolveMerchandiseFulfillment(
  fulfillment: ProductFulfillment | undefined,
): ProductFulfillment {
  if (fulfillment) {
    return {
      ...fulfillment,
      candidateCount: fulfillment.candidateCount > 0 ? fulfillment.candidateCount : DEFAULT_CANDIDATE_COUNT,
    };
  }
  return {
    fulfillmentType: "SHIPPING",
    temperatureZone: "AMBIENT",
    requiresScheduling: false,
    leadTimeBusinessDays: 2,
    transitDays: 1,
    shippableWeekdays: [1, 2, 3, 4, 5],
    cutoffTime: "12:00",
    availableTimeSlots: [],
    candidateCount: DEFAULT_CANDIDATE_COUNT,
  };
}

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

  // 配送・日程調整の設定（既存レコードには存在しない）
  fulfillment?: ProductFulfillment;

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
