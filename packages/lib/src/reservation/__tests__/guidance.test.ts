import {
  canDiscloseReservationGuidance,
  getReservationCodeGuidance,
  getReservationPageGuidance,
  isReservationSystem,
  looksLikeHotPepperNonTopUrl,
  resolveReservationSystem,
} from "../guidance";

describe("resolveReservationSystem", () => {
  it("未設定の既存商品は OTHER として扱う", () => {
    expect(resolveReservationSystem(undefined)).toBe("OTHER");
    expect(resolveReservationSystem({})).toBe("OTHER");
  });

  it("設定済みの値はそのまま返す", () => {
    expect(resolveReservationSystem({ reservationSystem: "HOT_PEPPER_BEAUTY" })).toBe("HOT_PEPPER_BEAUTY");
  });
});

describe("isReservationSystem", () => {
  it("定義済みの値だけを受け付ける", () => {
    expect(isReservationSystem("HOT_PEPPER_BEAUTY")).toBe(true);
    expect(isReservationSystem("OTHER")).toBe(true);
    expect(isReservationSystem("hotpepper")).toBe(false);
    expect(isReservationSystem(undefined)).toBe(false);
  });
});

describe("案内文", () => {
  it("ホットペッパービューティーはメニュー選択と質問欄への入力を案内する", () => {
    expect(getReservationPageGuidance("HOT_PEPPER_BEAUTY")).toContain("メニューまたはクーポンを選んで");
    expect(getReservationCodeGuidance("HOT_PEPPER_BEAUTY")).toContain("「サロンからの質問」欄");
  });

  it("その他は従来どおり備考欄・電話・来店時に伝えてもらう", () => {
    expect(getReservationPageGuidance("OTHER")).toBeUndefined();
    expect(getReservationCodeGuidance("OTHER")).toContain("備考欄");
  });
});

describe("looksLikeHotPepperNonTopUrl", () => {
  it("サロンのトップページは注意しない", () => {
    expect(looksLikeHotPepperNonTopUrl("https://beauty.hotpepper.jp/slnH000123456/")).toBe(false);
    expect(looksLikeHotPepperNonTopUrl("https://beauty.hotpepper.jp/slnH000123456")).toBe(false);
  });

  it("クーポン・メニューの個別ページや予約画面は注意する", () => {
    expect(looksLikeHotPepperNonTopUrl("https://beauty.hotpepper.jp/slnH000123456/coupon/")).toBe(true);
    expect(looksLikeHotPepperNonTopUrl("https://beauty.hotpepper.jp/slnH000123456/menu/")).toBe(true);
    expect(
      looksLikeHotPepperNonTopUrl("https://beauty.hotpepper.jp/CSP/bt/reserve/?storeId=H000123456&couponId=CP1"),
    ).toBe(true);
  });

  it("ホットペッパー以外の URL や不正な文字列は注意しない", () => {
    expect(looksLikeHotPepperNonTopUrl("https://example.com/reserve/menu/1")).toBe(false);
    expect(looksLikeHotPepperNonTopUrl("not a url")).toBe(false);
    expect(looksLikeHotPepperNonTopUrl("https://beauty.hotpepper.jp/")).toBe(false);
  });
});

describe("canDiscloseReservationGuidance", () => {
  it("承認待ちの間は予約先・交換番号を見せない（No.52）", () => {
    expect(canDiscloseReservationGuidance("REQUESTED")).toBe(false);
    expect(canDiscloseReservationGuidance(undefined)).toBe(false);
  });

  it("承認後（準備中・対応中・完了）は見せる", () => {
    expect(canDiscloseReservationGuidance("PREPARING")).toBe(true);
    expect(canDiscloseReservationGuidance("IN_PROGRESS")).toBe(true);
    expect(canDiscloseReservationGuidance("COMPLETED")).toBe(true);
  });

  it("却下・キャンセル後は見せない", () => {
    expect(canDiscloseReservationGuidance("REJECTED")).toBe(false);
    expect(canDiscloseReservationGuidance("CANCELED")).toBe(false);
    expect(canDiscloseReservationGuidance("CANCELLED")).toBe(false);
  });
});
