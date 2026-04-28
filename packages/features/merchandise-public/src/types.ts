import type {
  ExchangeHistoryStatus,
  Merchandise,
  MerchandiseDeliveryMethod,
  MerchandiseGenre,
  MerchandiseTag,
} from "@correcre/types";

export type PublicMerchandiseSummary = {
  merchandiseId: string;
  merchantId: string;
  merchantName: string;
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
  cardImageViewUrl?: string;
  detailImageViewUrl?: string;
  tags?: MerchandiseTag[];
  productCode?: string;
  contentVolume?: string;
  expiration?: string;
  deliverySchedule?: string;
  notes?: string;
};

export type PublicMerchandiseDetail = PublicMerchandiseSummary;

export function toPublicMerchandiseSummary(
  merchandise: Merchandise,
  merchantName: string,
  imageUrls: { cardImageViewUrl?: string; detailImageViewUrl?: string },
): PublicMerchandiseSummary {
  return {
    merchandiseId: merchandise.merchandiseId,
    merchantId: merchandise.merchantId,
    merchantName,
    heading: merchandise.heading,
    merchandiseName: merchandise.merchandiseName,
    serviceDescription: merchandise.serviceDescription,
    priceYen: merchandise.priceYen,
    requiredPoint: merchandise.requiredPoint,
    deliveryMethods: merchandise.deliveryMethods,
    serviceArea: merchandise.serviceArea,
    genre: merchandise.genre,
    genreOther: merchandise.genreOther,
    publishDate: merchandise.publishDate,
    cardImageViewUrl: imageUrls.cardImageViewUrl,
    detailImageViewUrl: imageUrls.detailImageViewUrl,
    tags: merchandise.tags,
    productCode: merchandise.productCode,
    contentVolume: merchandise.contentVolume,
    expiration: merchandise.expiration,
    deliverySchedule: merchandise.deliverySchedule,
    notes: merchandise.notes,
  };
}

export type ExchangeStatusBadge = {
  label: string;
  className: string;
};

const EXCHANGE_STATUS_BADGES: Record<ExchangeHistoryStatus, ExchangeStatusBadge> = {
  REQUESTED: { label: "申請中", className: "bg-amber-100 text-amber-800" },
  PREPARING: { label: "準備中", className: "bg-blue-100 text-blue-800" },
  IN_PROGRESS: { label: "対応中", className: "bg-indigo-100 text-indigo-800" },
  COMPLETED: { label: "完了", className: "bg-emerald-100 text-emerald-800" },
  REJECTED: { label: "却下", className: "bg-red-100 text-red-800" },
  CANCELED: { label: "キャンセル", className: "bg-slate-100 text-slate-700" },
  CANCELLED: { label: "キャンセル", className: "bg-slate-100 text-slate-700" },
};

const DEFAULT_EXCHANGE_STATUS_BADGE: ExchangeStatusBadge = {
  label: "完了",
  className: "bg-emerald-100 text-emerald-800",
};

export function getExchangeStatusBadge(status?: ExchangeHistoryStatus | null): ExchangeStatusBadge {
  if (!status) {
    return DEFAULT_EXCHANGE_STATUS_BADGE;
  }

  return EXCHANGE_STATUS_BADGES[status] ?? DEFAULT_EXCHANGE_STATUS_BADGE;
}

export function getExchangeStatusLabel(status?: ExchangeHistoryStatus | null): string {
  return getExchangeStatusBadge(status).label;
}

export function isPointConsumed(status?: ExchangeHistoryStatus | null): boolean {
  if (!status) {
    return true;
  }
  return status !== "REJECTED" && status !== "CANCELED" && status !== "CANCELLED";
}
