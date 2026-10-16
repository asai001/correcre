import type { ExchangeHistoryItem } from "@correcre/types";

import { aggregateMerchantExpense } from "../merchant-expense";

// 運用者の支出は「提携企業への支払額（売上 − 交換手数料）」。
// 提携企業側の「収支・精算」の請求額と同じ金額になることを固定する。
function exchange(overrides: Partial<ExchangeHistoryItem>): ExchangeHistoryItem {
  return {
    pk: "COMPANY#c1#USER#u1",
    sk: "EXCHANGED_AT#2026-10-01T00:00:00.000Z#EXCHANGE#e1",
    exchangeId: "e1",
    companyId: "c1",
    userId: "u1",
    merchandiseNameSnapshot: "フェイシャルエステ",
    usedPoint: 600,
    status: "COMPLETED",
    exchangedAt: "2026-10-01T00:00:00.000Z",
    completedAt: "2026-10-03T00:00:00.000Z",
    gsi1pk: "COMPANY#c1",
    gsi1sk: "EXCHANGED_AT#2026-10-01T00:00:00.000Z#USER#u1#EXCHANGE#e1",
    ...overrides,
  };
}

test("支出は売上から手数料を引いた支払額（提携企業の請求額と同じ）", () => {
  const result = aggregateMerchantExpense({
    exchanges: [
      exchange({ exchangeId: "e1", usedPoint: 600 }), // 3,000 円
      exchange({ exchangeId: "e2", usedPoint: 100, merchandiseNameSnapshot: "スフレチーズケーキ" }), // 500 円
    ],
    exchangeFeePercent: 5,
    months: ["2026-10"],
  });

  expect(result.byMonth["2026-10"]).toMatchObject({ salesYen: 3500, exchangeFeeYen: 175, payableYen: 3325 });
  expect(result.totalExpenseYen).toBe(3325);
});

test("手数料は交換ごとではなく月の売上合計にかけて切り捨てる", () => {
  // 交換ごとに切り捨てると 3 × floor(15 × 5%) = 0 円になるが、月合計なら floor(45 × 5%) = 2 円
  const result = aggregateMerchantExpense({
    exchanges: [
      exchange({ exchangeId: "e1", usedPoint: 3 }),
      exchange({ exchangeId: "e2", usedPoint: 3 }),
      exchange({ exchangeId: "e3", usedPoint: 3 }),
    ],
    exchangeFeePercent: 5,
    months: ["2026-10"],
  });

  expect(result.byMonth["2026-10"]).toMatchObject({ salesYen: 45, exchangeFeeYen: 2, payableYen: 43 });
});

test("内訳には完了した交換を完了日順に並べ、申請者の情報を添える", () => {
  const result = aggregateMerchantExpense({
    exchanges: [
      exchange({ exchangeId: "late", completedAt: "2026-10-20T00:00:00.000Z" }),
      exchange({ exchangeId: "early", completedAt: "2026-10-05T00:00:00.000Z" }),
      exchange({ exchangeId: "pending", status: "IN_PROGRESS", completedAt: undefined }),
    ],
    exchangeFeePercent: 5,
    months: ["2026-10"],
    describeApplicant: (item) => ({ applicantName: `申請者-${item.exchangeId}`, companyName: "シラカワ" }),
  });

  const rows = result.byMonth["2026-10"]?.exchanges ?? [];
  expect(rows.map((row) => row.exchangeId)).toEqual(["early", "late"]);
  expect(rows[0]).toMatchObject({
    merchandiseName: "フェイシャルエステ",
    usedPoint: 600,
    amountYen: 3000,
    applicantName: "申請者-early",
    companyName: "シラカワ",
  });
});

test("表示対象外の月は明細を持たないが、累計の支払額には含める", () => {
  const result = aggregateMerchantExpense({
    exchanges: [
      exchange({ exchangeId: "old", completedAt: "2025-01-10T00:00:00.000Z" }),
      exchange({ exchangeId: "now", completedAt: "2026-10-10T00:00:00.000Z" }),
    ],
    exchangeFeePercent: 5,
    months: ["2026-10"],
  });

  expect(Object.keys(result.byMonth)).toEqual(["2026-10"]);
  expect(result.totalExpenseYen).toBe(2850 * 2);
});
