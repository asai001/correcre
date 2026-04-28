import type {
  Merchandise,
  MerchandiseDeliveryMethod,
  MerchandiseGenre,
  MerchandiseStatus,
  MerchandiseTag,
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
  requiredPoint: number;
  deliveryMethods: MerchandiseDeliveryMethod[];
  serviceArea: string;
  genre: MerchandiseGenre;
  genreOther?: string;
  publishDate?: string;
  cardImage?: {
    s3Key: string;
    contentType: string;
  };
  detailImage?: {
    s3Key: string;
    contentType: string;
  };
  tags?: MerchandiseTag[];
  productCode?: string;
  contentVolume?: string;
  expiration?: string;
  deliverySchedule?: string;
  notes?: string;
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
