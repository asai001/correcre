import { describe, expect, test } from "vitest";

import { reflectPoints } from "./points-reflection";

// 翌月反映モデル: pendingPointYearMonth が現在月より前なら pending を利用可能残高へ繰り入れる。
// employee の残高表示と交換可否判定がこの関数に依存している。
describe("reflectPoints", () => {
  test("pending が前月分なら利用可能残高へ繰り入れ changed=true", () => {
    const result = reflectPoints(
      { currentPointBalance: 100, pendingPointBalance: 40, pendingPointYearMonth: "2026-08" },
      "2026-09",
    );

    expect(result).toEqual({
      spendablePoint: 140,
      pendingPoint: 0,
      pendingPointYearMonth: undefined,
      changed: true,
    });
  });

  test("pending が当月分ならまだ使えず changed=false", () => {
    const result = reflectPoints(
      { currentPointBalance: 100, pendingPointBalance: 40, pendingPointYearMonth: "2026-09" },
      "2026-09",
    );

    expect(result).toEqual({
      spendablePoint: 100,
      pendingPoint: 40,
      pendingPointYearMonth: "2026-09",
      changed: false,
    });
  });

  test("pending が未来月（時計ずれ等）なら繰り入れない", () => {
    const result = reflectPoints(
      { currentPointBalance: 100, pendingPointBalance: 40, pendingPointYearMonth: "2026-10" },
      "2026-09",
    );

    expect(result.spendablePoint).toBe(100);
    expect(result.pendingPoint).toBe(40);
    expect(result.changed).toBe(false);
  });

  test("年をまたぐ繰り入れ（12月分を翌年1月に反映）", () => {
    const result = reflectPoints(
      { currentPointBalance: 0, pendingPointBalance: 25, pendingPointYearMonth: "2026-12" },
      "2027-01",
    );

    expect(result.spendablePoint).toBe(25);
    expect(result.changed).toBe(true);
  });

  test("複数月放置されていても一度に全額繰り入れる", () => {
    const result = reflectPoints(
      { currentPointBalance: 10, pendingPointBalance: 90, pendingPointYearMonth: "2026-03" },
      "2026-09",
    );

    expect(result.spendablePoint).toBe(100);
    expect(result.pendingPoint).toBe(0);
  });

  test("pendingPointYearMonth が無ければ pending は据え置き", () => {
    const result = reflectPoints({ currentPointBalance: 10, pendingPointBalance: 5 }, "2026-09");

    expect(result).toEqual({
      spendablePoint: 10,
      pendingPoint: 5,
      pendingPointYearMonth: undefined,
      changed: false,
    });
  });

  test("残高フィールドが未定義なら 0 として扱う", () => {
    expect(reflectPoints({}, "2026-09")).toEqual({
      spendablePoint: 0,
      pendingPoint: 0,
      pendingPointYearMonth: undefined,
      changed: false,
    });
  });
});
