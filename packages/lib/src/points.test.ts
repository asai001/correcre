import { describe, expect, test } from "vitest";

import { FULL_SCORE, POINT_YEN_VALUE, calculateMissionRewardPoint } from "./points";

// ミッション報酬ポイント = round(score * 従業員1人あたり月額 / 100 / 5円)。
// admin / employee / operator が同じ関数で採点結果をポイントに変換するため、
// ここがズレると各アプリの表示と付与額が食い違う。
describe("calculateMissionRewardPoint", () => {
  test("満点なら月額の全額を 1pt=5円 換算したポイントになる", () => {
    expect(calculateMissionRewardPoint({ score: FULL_SCORE, perEmployeeMonthlyFee: 1000 })).toBe(
      1000 / POINT_YEN_VALUE,
    );
  });

  test("スコアに比例して按分される", () => {
    expect(calculateMissionRewardPoint({ score: 50, perEmployeeMonthlyFee: 1000 })).toBe(100);
    expect(calculateMissionRewardPoint({ score: 25, perEmployeeMonthlyFee: 1000 })).toBe(50);
  });

  test("端数は四捨五入する", () => {
    // 33 * 1000 / 100 / 5 = 66
    expect(calculateMissionRewardPoint({ score: 33, perEmployeeMonthlyFee: 1000 })).toBe(66);
    // 1 * 1234 / 100 / 5 = 2.468 -> 2
    expect(calculateMissionRewardPoint({ score: 1, perEmployeeMonthlyFee: 1234 })).toBe(2);
    // 1 * 1250 / 100 / 5 = 2.5 -> 3
    expect(calculateMissionRewardPoint({ score: 1, perEmployeeMonthlyFee: 1250 })).toBe(3);
  });

  test("スコアが 0 以下または不正値なら 0", () => {
    expect(calculateMissionRewardPoint({ score: 0, perEmployeeMonthlyFee: 1000 })).toBe(0);
    expect(calculateMissionRewardPoint({ score: -10, perEmployeeMonthlyFee: 1000 })).toBe(0);
    expect(calculateMissionRewardPoint({ score: Number.NaN, perEmployeeMonthlyFee: 1000 })).toBe(0);
    expect(calculateMissionRewardPoint({ score: Number.POSITIVE_INFINITY, perEmployeeMonthlyFee: 1000 })).toBe(0);
  });

  test("月額が 0 以下または不正値なら 0", () => {
    expect(calculateMissionRewardPoint({ score: 100, perEmployeeMonthlyFee: 0 })).toBe(0);
    expect(calculateMissionRewardPoint({ score: 100, perEmployeeMonthlyFee: -1 })).toBe(0);
    expect(calculateMissionRewardPoint({ score: 100, perEmployeeMonthlyFee: Number.NaN })).toBe(0);
  });
});
