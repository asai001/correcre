import { afterEach, describe, expect, test, vi } from "vitest";

import {
  isValidYYYYMM,
  nowYYYYMM,
  nowYYYYMMDD,
  toYYYYMM,
  toYYYYMMDD,
  toYYYYMMDDHHmm,
  toYYYYMMDDHHmmss,
} from "./format";

// 「翌月反映」の判定は JST の年月に依存するため、UTC と JST で日付がずれる境界を重点的に見る。
// 2026-08-31T15:00:00Z は JST では 2026-09-01 00:00:00。
const JST_MONTH_BOUNDARY_UTC = new Date("2026-08-31T15:00:00.000Z");
const JUST_BEFORE_BOUNDARY_UTC = new Date("2026-08-31T14:59:59.000Z");

describe("toYYYYMM", () => {
  test("既定では JST で年月を求める", () => {
    expect(toYYYYMM(JST_MONTH_BOUNDARY_UTC)).toBe("2026-09");
    expect(toYYYYMM(JUST_BEFORE_BOUNDARY_UTC)).toBe("2026-08");
  });

  test("タイムゾーンを指定できる", () => {
    expect(toYYYYMM(JST_MONTH_BOUNDARY_UTC, "UTC")).toBe("2026-08");
  });
});

describe("toYYYYMMDD", () => {
  test("JST の日付境界をまたぐ", () => {
    expect(toYYYYMMDD(JST_MONTH_BOUNDARY_UTC)).toBe("2026-09-01");
    expect(toYYYYMMDD(JUST_BEFORE_BOUNDARY_UTC)).toBe("2026-08-31");
  });
});

describe("toYYYYMMDDHHmm / toYYYYMMDDHHmmss", () => {
  test("時分秒を含めて JST でフォーマットする", () => {
    const date = new Date("2026-03-04T05:06:07.000Z");
    expect(toYYYYMMDDHHmm(date)).toBe("2026-03-04T14:06");
    expect(toYYYYMMDDHHmmss(date)).toBe("2026-03-04T14:06:07");
  });

  test("0 時は 24 ではなく 00 で表記する", () => {
    expect(toYYYYMMDDHHmmss(JST_MONTH_BOUNDARY_UTC)).toBe("2026-09-01T00:00:00");
  });
});

describe("now* 系", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("現在時刻を JST で整形する", () => {
    vi.useFakeTimers();
    vi.setSystemTime(JST_MONTH_BOUNDARY_UTC);

    expect(nowYYYYMM()).toBe("2026-09");
    expect(nowYYYYMMDD()).toBe("2026-09-01");
    expect(nowYYYYMM("UTC")).toBe("2026-08");
  });
});

describe("isValidYYYYMM", () => {
  test("正しい形式と範囲なら true", () => {
    expect(isValidYYYYMM("2026-01")).toBe(true);
    expect(isValidYYYYMM("2026-12")).toBe(true);
    expect(isValidYYYYMM("1900-01")).toBe(true);
    expect(isValidYYYYMM("2100-12")).toBe(true);
  });

  test("空や未定義は false", () => {
    expect(isValidYYYYMM(undefined)).toBe(false);
    expect(isValidYYYYMM(null)).toBe(false);
    expect(isValidYYYYMM("")).toBe(false);
  });

  test("形式違いは false", () => {
    expect(isValidYYYYMM("2026-1")).toBe(false);
    expect(isValidYYYYMM("2026/01")).toBe(false);
    expect(isValidYYYYMM("2026-01-01")).toBe(false);
    expect(isValidYYYYMM("202601")).toBe(false);
  });

  test("月や年の範囲外は false", () => {
    expect(isValidYYYYMM("2026-00")).toBe(false);
    expect(isValidYYYYMM("2026-13")).toBe(false);
    expect(isValidYYYYMM("1899-12")).toBe(false);
    expect(isValidYYYYMM("2101-01")).toBe(false);
  });
});
