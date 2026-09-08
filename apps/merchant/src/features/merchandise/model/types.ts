import type {
  Merchandise,
  MerchandiseDeliveryMethod,
  MerchandiseGenre,
  MerchandiseReservation,
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
  // 未設定 = 予約不要。設定時は reservationUrl / instructions の少なくとも一方が必要。
  reservation?: MerchandiseReservation;
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

export type CreateMerchandiseRequest = MerchandiseFormPayload & {
  // 登録時の公開状態。省略時は PUBLISHED（登録ボタン = そのまま公開）。
  // 「下書き保存」ボタンからは DRAFT を送る。
  initialStatus?: "PUBLISHED" | "DRAFT";
};

export type UpdateMerchandiseRequest = MerchandiseFormPayload & {
  // true のとき、保存と同時に公開する（下書きの編集画面の「保存して公開する」ボタン）。
  // 公開を伴うため必須チェックは通常どおり行われる。
  publish?: boolean;
};

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
