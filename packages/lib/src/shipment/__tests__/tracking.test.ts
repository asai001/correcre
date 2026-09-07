import {
  buildTrackingUrl,
  InvalidShipmentInputError,
  isTrackingNumberMissing,
  normalizeShipmentInput,
  normalizeTrackingNumber,
  resolveCarrierLabel,
} from "../tracking";

describe("normalizeTrackingNumber", () => {
  test("ハイフン・空白・全角数字の表記ゆれを数字列にそろえる", () => {
    expect(normalizeTrackingNumber("1234-5678-9012")).toBe("123456789012");
    expect(normalizeTrackingNumber(" 1234 5678 9012 ")).toBe("123456789012");
    expect(normalizeTrackingNumber("１２３４５６７８９０１２")).toBe("123456789012");
  });

  test("未入力は空文字を返す", () => {
    expect(normalizeTrackingNumber(undefined)).toBe("");
    expect(normalizeTrackingNumber("")).toBe("");
  });
});

describe("normalizeShipmentInput", () => {
  test("何も入力されていなければ undefined（＝発送情報なしで発送済みに進める）", () => {
    expect(normalizeShipmentInput(undefined)).toBeUndefined();
    expect(normalizeShipmentInput({ carrier: "", trackingNumber: "" })).toBeUndefined();
  });

  test("配送会社と番号がそろえば正規化して返す", () => {
    expect(normalizeShipmentInput({ carrier: "YAMATO", trackingNumber: "1234-5678-9012" })).toEqual({
      carrier: "YAMATO",
      trackingNumber: "123456789012",
    });
  });

  test("配送会社だけの入力も許す（番号は後から足せる）", () => {
    expect(normalizeShipmentInput({ carrier: "SAGAWA" })).toEqual({ carrier: "SAGAWA" });
  });

  test("番号だけで配送会社が無いと弾く", () => {
    expect(() => normalizeShipmentInput({ trackingNumber: "123456789012" })).toThrow(
      InvalidShipmentInputError,
    );
  });

  test("桁数が範囲外・数字以外は弾く", () => {
    expect(() => normalizeShipmentInput({ carrier: "YAMATO", trackingNumber: "1234" })).toThrow(
      InvalidShipmentInputError,
    );
    expect(() => normalizeShipmentInput({ carrier: "YAMATO", trackingNumber: "ABCD12345678" })).toThrow(
      InvalidShipmentInputError,
    );
  });

  test("その他は配送会社名の入力を求める", () => {
    expect(() => normalizeShipmentInput({ carrier: "OTHER", trackingNumber: "123456789012" })).toThrow(
      InvalidShipmentInputError,
    );
    expect(
      normalizeShipmentInput({ carrier: "OTHER", carrierName: "西濃運輸", trackingNumber: "123456789012" }),
    ).toEqual({ carrier: "OTHER", carrierName: "西濃運輸", trackingNumber: "123456789012" });
  });

  test("未知の配送会社は弾く", () => {
    expect(() => normalizeShipmentInput({ carrier: "UNKNOWN" })).toThrow(InvalidShipmentInputError);
  });

  test("文字列でない値が来ても落ちず、未入力として扱う", () => {
    const malformed = { carrier: 123, trackingNumber: ["1234"] } as unknown as Parameters<
      typeof normalizeShipmentInput
    >[0];
    expect(normalizeShipmentInput(malformed)).toBeUndefined();
  });
});

describe("buildTrackingUrl", () => {
  test("追跡ページを特定できる会社は番号入りの URL を返す", () => {
    expect(buildTrackingUrl({ carrier: "YAMATO", trackingNumber: "123456789012" })).toBe(
      "https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number00=1&number01=123456789012",
    );
    expect(buildTrackingUrl({ carrier: "SAGAWA", trackingNumber: "123456789012" })).toBe(
      "https://k2k.sagawa-exp.co.jp/p/web/okurijosearch.do?okurijoNo=123456789012",
    );
    expect(buildTrackingUrl({ carrier: "JAPAN_POST", trackingNumber: "123456789012" })).toBe(
      "https://trackings.post.japanpost.jp/services/srv/search/direct?locale=ja&reqCodeNo1=123456789012",
    );
  });

  test("その他・番号なし・発送情報なしでは URL を作らない", () => {
    expect(buildTrackingUrl({ carrier: "OTHER", trackingNumber: "123456789012" })).toBeUndefined();
    expect(buildTrackingUrl({ carrier: "YAMATO" })).toBeUndefined();
    expect(buildTrackingUrl(undefined)).toBeUndefined();
  });
});

describe("resolveCarrierLabel", () => {
  test("その他は merchant の入力名を優先する", () => {
    expect(resolveCarrierLabel({ carrier: "YAMATO" })).toBe("ヤマト運輸");
    expect(resolveCarrierLabel({ carrier: "OTHER", carrierName: "西濃運輸" })).toBe("西濃運輸");
    expect(resolveCarrierLabel({ carrier: "OTHER" })).toBe("その他");
    expect(resolveCarrierLabel(undefined)).toBeUndefined();
  });
});

describe("isTrackingNumberMissing", () => {
  test("番号が無ければ未登録とみなす", () => {
    expect(isTrackingNumberMissing(undefined)).toBe(true);
    expect(isTrackingNumberMissing({ carrier: "YAMATO" })).toBe(true);
    expect(isTrackingNumberMissing({ carrier: "YAMATO", trackingNumber: "123456789012" })).toBe(false);
  });
});
