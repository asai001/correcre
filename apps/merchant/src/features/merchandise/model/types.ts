import type {
  Merchandise,
  MerchandiseDeliveryMethod,
  MerchandiseGenre,
  MerchandiseStatus,
  ProductFulfillment,
} from "@correcre/types";

export type MerchandiseSummary = Merchandise & {
  cardImageViewUrl?: string;
  detailImageViewUrl?: string;
};

export type MerchandiseFormPayload = {
  heading: string;
  merchandiseName: string;
  serviceDescription: string;
  priceYen: number;
  deliveryMethods: MerchandiseDeliveryMethod[];
  serviceArea: string;
  genre: MerchandiseGenre;
  genreOther?: string;
  cardImage?: {
    s3Key: string;
    contentType: string;
  };
  detailImage?: {
    s3Key: string;
    contentType: string;
  };
  contentVolume?: string;
  expiration?: string;
  deliverySchedule?: string;
  notes?: string;
  fulfillment?: ProductFulfillment;
};

// 配送・日程調整の設定が、実際にどの日付になるかの確認用。
// 日付の計算と表記はすべてサーバー側で行い、画面はそのまま表示するだけにする。
export type SchedulePreviewCandidate = {
  arrivalLabel: string;
  shipLabel: string;
  selectableUntilLabel: string;
};

export type SchedulePreviewResponse = {
  candidates: SchedulePreviewCandidate[];
  // 候補が作れないときの理由（発送可能曜日が未選択、休業日で埋まっている など）
  note?: string;
};

export type CreateMerchandiseRequest = MerchandiseFormPayload;

export type UpdateMerchandiseRequest = MerchandiseFormPayload;

export type UpdateMerchandiseStatusRequest = {
  status: MerchandiseStatus;
};

export type RequestUploadUrlRequest = {
  contentType: string;
  contentLength: number;
};

export type RequestUploadUrlResponse = {
  uploadUrl: string;
  s3Key: string;
  expiresAt: string;
};

export type RequestViewUrlResponse = {
  viewUrl: string;
  expiresAt: string;
};
