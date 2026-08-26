import {
  calcSelectableUntil,
  generateCandidates,
  isSelectable,
  isShippableDate,
  listShippableDates,
  validateRequestedDate,
  type ScheduleCalendarSettings,
  type ScheduleProductSettings,
} from "../engine";
import { subtractBusinessDays } from "../../date/business-days";

// JST の日時から Date を作る（テストの可読性のため）
function jst(dateTime: string): Date {
  return new Date(`${dateTime}+09:00`);
}

// 仕様の基準ケース: 発送可能曜日が火・金、leadTime 2 営業日、transitDays 1、cutoff 12:00
const product: ScheduleProductSettings = {
  leadTimeBusinessDays: 2,
  transitDays: 1,
  shippableWeekdays: [2, 5],
  cutoffTime: "12:00",
  candidateCount: 4,
};

// 土日定休・祝日休業（既定）のカレンダー
const calendar: ScheduleCalendarSettings = {
  closedDates: [],
  regularClosedWeekdays: [0, 6],
};

describe("listShippableDates", () => {
  test("火・金のみを発送可能日として列挙する", () => {
    // 2026-06-01 は月曜
    expect(listShippableDates("2026-06-01", 4, product, calendar)).toEqual([
      "2026-06-02",
      "2026-06-05",
      "2026-06-09",
      "2026-06-12",
    ]);
  });

  test("closedDates に登録した日を除外する", () => {
    const withClosed = { ...calendar, closedDates: ["2026-06-09"] };
    expect(listShippableDates("2026-06-01", 4, product, withClosed)).toEqual([
      "2026-06-02",
      "2026-06-05",
      "2026-06-12",
      "2026-06-16",
    ]);
  });

  test("祝日を既定で除外し、フラグで営業扱いにできる", () => {
    // 2026-11-03（火）は文化の日
    expect(listShippableDates("2026-11-02", 2, product, calendar)).toEqual([
      "2026-11-06",
      "2026-11-10",
    ]);

    const holidaysOpen = { ...calendar, treatPublicHolidaysAsClosed: false };
    expect(listShippableDates("2026-11-02", 2, product, holidaysOpen)).toEqual([
      "2026-11-03",
      "2026-11-06",
    ]);
  });
});

describe("subtractBusinessDays（土日を挟む営業日カウント）", () => {
  test("火曜から 2 営業日遡ると土日を跨いで前週金曜になる", () => {
    // 2026-06-02(火) → 6/1(月) が 1 営業日、5/31(日)・5/30(土) は休み、5/29(金) が 2 営業日
    expect(subtractBusinessDays("2026-06-02", 2, calendar)).toBe("2026-05-29");
  });

  test("closedDates は営業日カウントからも除外される", () => {
    const withClosed = { ...calendar, closedDates: ["2026-06-11"] };
    // 2026-06-12(金) → 6/11(木) は臨時休業、6/10(水) が 1 営業日、6/9(火) が 2 営業日
    expect(subtractBusinessDays("2026-06-12", 2, withClosed)).toBe("2026-06-09");
  });

  test("count = 0 は同じ日付を返す", () => {
    expect(subtractBusinessDays("2026-06-02", 0, calendar)).toBe("2026-06-02");
  });

  test("全曜日が定休日でも無限ループせずエラーになる", () => {
    const allClosed = { closedDates: [], regularClosedWeekdays: [0, 1, 2, 3, 4, 5, 6] };
    expect(() => subtractBusinessDays("2026-06-02", 1, allClosed)).toThrow(
      "営業日の計算が収束しません",
    );
  });
});

describe("calcSelectableUntil", () => {
  test("発送日から 2 営業日遡った日の cutoffTime (JST) を ISO8601 で返す", () => {
    // 発送 2026-06-05(金) → 締切は 6/3(水) 12:00 JST = 03:00 UTC
    expect(calcSelectableUntil("2026-06-05", product, calendar)).toBe("2026-06-03T03:00:00.000Z");
  });
});

describe("generateCandidates（月曜申請の基準ケース）", () => {
  test("締切が過ぎた直近の発送日は除外され、選択可能な候補だけが返る", () => {
    // 月曜 09:00 に申請。6/2(火) 発送の締切は 5/29(金) 12:00 で既に過ぎているため除外。
    const candidates = generateCandidates(jst("2026-06-01T09:00:00"), product, calendar);

    expect(candidates).toEqual([
      { shipDate: "2026-06-05", arrivalDate: "2026-06-06", selectableUntil: "2026-06-03T03:00:00.000Z" },
      { shipDate: "2026-06-09", arrivalDate: "2026-06-10", selectableUntil: "2026-06-05T03:00:00.000Z" },
      { shipDate: "2026-06-12", arrivalDate: "2026-06-13", selectableUntil: "2026-06-10T03:00:00.000Z" },
      { shipDate: "2026-06-16", arrivalDate: "2026-06-17", selectableUntil: "2026-06-12T03:00:00.000Z" },
    ]);
  });

  test("cutoffTime 直前は当該候補が含まれ、直後は外れる", () => {
    // 6/5(金) 発送の締切は 6/3(水) 12:00
    const before = generateCandidates(jst("2026-06-03T11:59:00"), product, calendar);
    expect(before[0].shipDate).toBe("2026-06-05");

    const after = generateCandidates(jst("2026-06-03T12:00:00"), product, calendar);
    expect(after[0].shipDate).toBe("2026-06-09");
  });

  test("月またぎ: 月末の申請で翌月の候補が返る", () => {
    // 2026-06-30(火) 09:00 申請。6/30 発送の締切は 6/26(金) 12:00 で過ぎている。
    const candidates = generateCandidates(jst("2026-06-30T09:00:00"), product, calendar);
    expect(candidates.map((candidate) => candidate.shipDate)).toEqual([
      "2026-07-03",
      "2026-07-07",
      "2026-07-10",
      "2026-07-14",
    ]);
  });

  test("年またぎ: 元日（祝日）を跨いで翌年の候補が返り、締切の営業日カウントも祝日を除外する", () => {
    // 2026-12-28(月) 09:00 申請。12/29(火) 発送の締切は 12/25(金) 12:00 で過ぎている。
    // 2027-01-01(金) は元日のため発送不可。次の発送可能日は 2027-01-05(火)。
    const candidates = generateCandidates(jst("2026-12-28T09:00:00"), product, calendar);

    expect(candidates[0].shipDate).toBe("2027-01-05");
    expect(candidates[0].arrivalDate).toBe("2027-01-06");
    // 1/5 から 2 営業日遡ると、1/4(月) が 1 営業日、1/1(金・祝) は休業、12/31(木) が 2 営業日
    expect(candidates[0].selectableUntil).toBe("2026-12-31T03:00:00.000Z");
  });

  test("探索範囲内に発送可能日がなければ空配列を返す（自動キャンセルはしない）", () => {
    const noShippable: ScheduleProductSettings = { ...product, shippableWeekdays: [] };
    expect(generateCandidates(jst("2026-06-01T09:00:00"), noShippable, calendar)).toEqual([]);
  });
});

describe("isSelectable（表示フィルタと確定時検証の共通判定）", () => {
  const candidate = {
    shipDate: "2026-06-05",
    arrivalDate: "2026-06-06",
    selectableUntil: "2026-06-03T03:00:00.000Z",
  };

  test("締切前は true、締切ちょうど・締切後は false", () => {
    expect(isSelectable(candidate, jst("2026-06-03T11:59:59"))).toBe(true);
    expect(isSelectable(candidate, jst("2026-06-03T12:00:00"))).toBe(false);
    expect(isSelectable(candidate, jst("2026-06-03T12:00:01"))).toBe(false);
  });

  test("全候補が期限切れになるケースを検出できる", () => {
    const candidates = generateCandidates(jst("2026-06-01T09:00:00"), product, calendar);
    const afterAllDeadlines = jst("2026-06-12T12:00:00");
    expect(candidates.some((entry) => isSelectable(entry, afterAllDeadlines))).toBe(false);
  });
});

describe("validateRequestedDate", () => {
  const now = jst("2026-06-01T09:00:00");

  test("成立する希望日は発送日を返す", () => {
    // 希望到着 2026-06-10(水) → 発送 6/9(火)。締切 6/5(金) 12:00 は未来。
    expect(validateRequestedDate("2026-06-10", now, product, calendar)).toEqual({
      ok: true,
      shipDate: "2026-06-09",
    });
  });

  test("発送可能曜日でない発送日はその旨を返す", () => {
    // 希望到着 2026-06-11(木) → 発送 6/10(水) は火・金ではない
    const result = validateRequestedDate("2026-06-11", now, product, calendar);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("発送可能曜日");
      expect(result.reason).toContain("火・金");
    }
  });

  test("休業日にあたる発送日はその旨を返す", () => {
    const withClosed = { ...calendar, closedDates: ["2026-06-09"] };
    const result = validateRequestedDate("2026-06-10", now, product, withClosed);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("休業日");
    }
  });

  test("準備期間が確保できない希望日はその旨を返す", () => {
    // 希望到着 2026-06-03(水) → 発送 6/2(火)。締切 5/29(金) 12:00 は過去。
    const result = validateRequestedDate("2026-06-03", now, product, calendar);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("発送準備");
    }
  });

  test("過去・当日・不正な形式を拒否する", () => {
    expect(validateRequestedDate("2026-06-01", now, product, calendar).ok).toBe(false);
    expect(validateRequestedDate("2026-05-20", now, product, calendar).ok).toBe(false);
    expect(validateRequestedDate("2026-13-01", now, product, calendar).ok).toBe(false);
    expect(validateRequestedDate("June 10", now, product, calendar).ok).toBe(false);
  });
});

describe("isShippableDate", () => {
  test("カレンダー未登録（null）の場合は祝日以外を営業日として扱う", () => {
    // 2026-07-20(月・海の日) を発送可能曜日に含む商品
    const mondayProduct = { ...product, shippableWeekdays: [1] };
    expect(isShippableDate("2026-07-20", mondayProduct, null)).toBe(false);
    expect(isShippableDate("2026-07-27", mondayProduct, null)).toBe(true);
  });
});
