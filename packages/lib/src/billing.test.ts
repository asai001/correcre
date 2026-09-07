import { describe, expect, test } from "vitest";

import {
  DEFAULT_EXCHANGE_FEE_PERCENT,
  calculateExchangeFeeYen,
  calculateMerchantInvoiceYen,
  resolveExchangeFeePercent,
} from "./billing";

// 提携企業の請求額と運用者の支払額は同じ関数から算出される。
// admin / merchant / operator の 3 アプリで金額表示が一致することをここで担保する。
describe("resolveExchangeFeePercent", () => {
  test("有効な範囲 (0〜100) はそのまま返す", () => {
    expect(resolveExchangeFeePercent(0)).toBe(0);
    expect(resolveExchangeFeePercent(7.5)).toBe(7.5);
    expect(resolveExchangeFeePercent(100)).toBe(100);
  });

  test("未設定・不正値は既定値にフォールバックする", () => {
    expect(resolveExchangeFeePercent(undefined)).toBe(DEFAULT_EXCHANGE_FEE_PERCENT);
    expect(resolveExchangeFeePercent(-1)).toBe(DEFAULT_EXCHANGE_FEE_PERCENT);
    expect(resolveExchangeFeePercent(101)).toBe(DEFAULT_EXCHANGE_FEE_PERCENT);
    expect(resolveExchangeFeePercent(Number.NaN)).toBe(DEFAULT_EXCHANGE_FEE_PERCENT);
    expect(resolveExchangeFeePercent("5" as unknown as number)).toBe(DEFAULT_EXCHANGE_FEE_PERCENT);
  });
});

describe("calculateExchangeFeeYen", () => {
  test("既定の手数料率で計算する", () => {
    expect(calculateExchangeFeeYen(10000)).toBe((10000 * DEFAULT_EXCHANGE_FEE_PERCENT) / 100);
  });

  test("個別設定の手数料率を優先する", () => {
    expect(calculateExchangeFeeYen(10000, 10)).toBe(1000);
    expect(calculateExchangeFeeYen(10000, 0)).toBe(0);
  });

  test("端数は切り捨てる（提携企業に不利にならない方向）", () => {
    // 999 * 5 / 100 = 49.95 -> 49
    expect(calculateExchangeFeeYen(999, 5)).toBe(49);
    // 1234 * 7.5 / 100 = 92.55 -> 92
    expect(calculateExchangeFeeYen(1234, 7.5)).toBe(92);
  });

  test("売上が 0 以下または不正値なら 0", () => {
    expect(calculateExchangeFeeYen(0)).toBe(0);
    expect(calculateExchangeFeeYen(-500)).toBe(0);
    expect(calculateExchangeFeeYen(Number.NaN)).toBe(0);
  });
});

describe("calculateMerchantInvoiceYen", () => {
  test("請求額 = 売上 − 手数料", () => {
    expect(calculateMerchantInvoiceYen(10000)).toBe(10000 - calculateExchangeFeeYen(10000));
    expect(calculateMerchantInvoiceYen(10000, 10)).toBe(9000);
  });

  test("手数料の切り捨て分は請求額側に残る", () => {
    // 手数料 49 円なので請求は 950 円
    expect(calculateMerchantInvoiceYen(999, 5)).toBe(950);
    expect(calculateExchangeFeeYen(999, 5) + calculateMerchantInvoiceYen(999, 5)).toBe(999);
  });

  test("売上が 0 以下または不正値なら 0", () => {
    expect(calculateMerchantInvoiceYen(0)).toBe(0);
    expect(calculateMerchantInvoiceYen(-1)).toBe(0);
    expect(calculateMerchantInvoiceYen(Number.POSITIVE_INFINITY)).toBe(0);
  });
});
