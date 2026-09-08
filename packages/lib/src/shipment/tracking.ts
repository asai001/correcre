// 発送情報（配送会社・送り状番号）の正規化と、各社の追跡ページ URL の組み立て。
// DB もネットワークも触らない純関数なので、サーバー・クライアントの双方から使える。
import type { ExchangeShipment, ShipmentCarrier } from "@correcre/types";

export const SHIPMENT_CARRIER_LABELS: Record<ShipmentCarrier, string> = {
  YAMATO: "ヤマト運輸",
  SAGAWA: "佐川急便",
  JAPAN_POST: "日本郵便",
  OTHER: "その他",
};

// 各社の追跡ページへの直リンク。{no} を送り状番号に差し替える。
// これらは各社の Web サイトの仕様であり、予告なく変わり得る（実際ヤマトは過去に変更している）。
// リンク切れの報告が来たらここだけを直せば済むよう、URL の組み立ては必ずこの 1 箇所に閉じる。
const TRACKING_URL_TEMPLATES: Record<ShipmentCarrier, string | null> = {
  YAMATO: "https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number00=1&number01={no}",
  SAGAWA: "https://k2k.sagawa-exp.co.jp/p/web/okurijosearch.do?okurijoNo={no}",
  JAPAN_POST: "https://trackings.post.japanpost.jp/services/srv/search/direct?locale=ja&reqCodeNo1={no}",
  // 自由入力の配送会社は追跡ページを特定できない。番号の表示だけに留める。
  OTHER: null,
};

// 送り状番号の桁数は配送会社・商品によって幅がある（ヤマト 12 桁、佐川 12 桁、
// ゆうパック 11〜13 桁など）。厳しく縛ると入力できない相手が出るので、
// 「数字のみ・8〜20 桁」という緩い範囲だけを弾く。
const TRACKING_NUMBER_PATTERN = /^\d{8,20}$/;

export const TRACKING_NUMBER_MAX_LENGTH = 20;
export const CARRIER_NAME_MAX_LENGTH = 50;

/** 送り状番号の表記ゆれ（ハイフン・空白・全角数字）を吸収して数字列にそろえる。 */
export function normalizeTrackingNumber(value: string | undefined | null): string {
  if (!value) return "";
  return value
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[\s-‐-―ー_]/g, "")
    .trim();
}

export function isValidTrackingNumber(value: string): boolean {
  return TRACKING_NUMBER_PATTERN.test(value);
}

/** 配送会社の表示名。OTHER は merchant が入力した名称を優先する。 */
export function resolveCarrierLabel(shipment: ExchangeShipment | undefined): string | undefined {
  if (!shipment?.carrier) return undefined;
  if (shipment.carrier === "OTHER") {
    return shipment.carrierName?.trim() || SHIPMENT_CARRIER_LABELS.OTHER;
  }
  return SHIPMENT_CARRIER_LABELS[shipment.carrier];
}

/**
 * 追跡ページの URL。配送会社と番号がそろっていて、かつ URL を特定できる会社のときだけ返す。
 * 返らない場合は「番号は表示するがリンクにはしない」表示にする。
 */
export function buildTrackingUrl(shipment: ExchangeShipment | undefined): string | undefined {
  if (!shipment?.carrier || !shipment.trackingNumber) return undefined;
  const template = TRACKING_URL_TEMPLATES[shipment.carrier];
  if (!template) return undefined;
  return template.replace("{no}", encodeURIComponent(shipment.trackingNumber));
}

export type ShipmentInput = {
  carrier?: string;
  carrierName?: string;
  trackingNumber?: string;
};

export class InvalidShipmentInputError extends Error {}

function isShipmentCarrier(value: string): value is ShipmentCarrier {
  return value in SHIPMENT_CARRIER_LABELS;
}

/**
 * 画面・API から受け取った発送情報を検証して保存用の形に整える。
 *
 * 何も入力されていない（配送会社も番号も無い）ケースは正常系。追跡番号は任意なので、
 * 未入力なら undefined を返し、呼び出し側は発送情報なしで発送済みに進める。
 * 入力された場合だけ、配送会社と番号の整合を見る。
 */
export function normalizeShipmentInput(input: ShipmentInput | undefined): ExchangeShipment | undefined {
  // API 経由で任意の JSON が届き得るので、文字列でない値は未入力として扱う
  // （型を信じて .trim() を呼ぶと 500 になる）。
  const asText = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

  const carrierRaw = asText(input?.carrier);
  const carrierName = asText(input?.carrierName);
  const trackingNumber = normalizeTrackingNumber(asText(input?.trackingNumber));

  if (!carrierRaw && !trackingNumber) {
    return undefined;
  }

  if (trackingNumber && !isValidTrackingNumber(trackingNumber)) {
    throw new InvalidShipmentInputError("送り状番号は 8〜20 桁の数字で入力してください。");
  }

  if (trackingNumber && !carrierRaw) {
    throw new InvalidShipmentInputError("配送会社を選択してください。");
  }

  if (carrierRaw && !isShipmentCarrier(carrierRaw)) {
    throw new InvalidShipmentInputError("配送会社の指定が不正です。");
  }

  if (carrierName.length > CARRIER_NAME_MAX_LENGTH) {
    throw new InvalidShipmentInputError(`配送会社名は ${CARRIER_NAME_MAX_LENGTH} 文字以内で入力してください。`);
  }

  const carrier = carrierRaw ? (carrierRaw as ShipmentCarrier) : undefined;

  if (carrier === "OTHER" && !carrierName) {
    throw new InvalidShipmentInputError("配送会社名を入力してください。");
  }

  const shipment: ExchangeShipment = {};
  if (carrier) shipment.carrier = carrier;
  if (carrier === "OTHER" && carrierName) shipment.carrierName = carrierName;
  if (trackingNumber) shipment.trackingNumber = trackingNumber;

  return shipment;
}

/** 追跡番号が未入力か（やることリストの「追跡番号を登録する」の判定に使う）。 */
export function isTrackingNumberMissing(shipment: ExchangeShipment | undefined): boolean {
  return !shipment?.trackingNumber;
}
