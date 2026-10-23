// 売上は申請時ではなく完了時に、完了した月で計上する（2026-10-14 定例で合意）。
import type { ExchangeHistoryStatus } from "@correcre/types";

import {
  getSalesRecognitionMonth,
  isSalesPendingExchange,
  isSalesRecognizedExchange,
  summarizeSalesPendingExchanges,
} from "../sales-recognition";

describe("isSalesRecognizedExchange", () => {
  test("完了した交換だけを売上に計上する", () => {
    expect(isSalesRecognizedExchange({ status: "COMPLETED" })).toBe(true);
  });

  test("申請中・準備中・対応中はまだ計上しない", () => {
    const pending: ExchangeHistoryStatus[] = ["REQUESTED", "PREPARING", "IN_PROGRESS"];
    for (const status of pending) {
      expect(isSalesRecognizedExchange({ status })).toBe(false);
    }
    expect(isSalesRecognizedExchange({ status: undefined })).toBe(false);
  });

  test("却下・キャンセル（完了後の取り消しを含む）は計上しない", () => {
    const closed: ExchangeHistoryStatus[] = ["REJECTED", "CANCELED", "CANCELLED"];
    for (const status of closed) {
      expect(isSalesRecognizedExchange({ status })).toBe(false);
    }
  });
});

describe("getSalesRecognitionMonth", () => {
  test("申請月ではなく完了した月で計上する", () => {
    expect(
      getSalesRecognitionMonth({
        status: "COMPLETED",
        exchangedAt: "2026-09-28T03:00:00.000Z",
        completedAt: "2026-10-02T03:00:00.000Z",
      }),
    ).toBe("2026-10");
  });

  test("completedAt がない古い完了レコードは履歴の完了イベントで補う", () => {
    expect(
      getSalesRecognitionMonth({
        status: "COMPLETED",
        exchangedAt: "2026-08-30T03:00:00.000Z",
        history: [
          { status: "REQUESTED", occurredAt: "2026-08-30T03:00:00.000Z", actorType: "EMPLOYEE" },
          { status: "COMPLETED", occurredAt: "2026-09-03T03:00:00.000Z", actorType: "MERCHANT" },
        ],
      }),
    ).toBe("2026-09");
  });

  test("完了日時を辿れない場合は申請日時で補う", () => {
    expect(
      getSalesRecognitionMonth({ status: "COMPLETED", exchangedAt: "2026-07-15T03:00:00.000Z" }),
    ).toBe("2026-07");
  });
});

describe("isSalesPendingExchange", () => {
  test("申請中・準備中・対応中は完了待ちとして扱う", () => {
    const pending: ExchangeHistoryStatus[] = ["REQUESTED", "PREPARING", "IN_PROGRESS"];
    for (const status of pending) {
      expect(isSalesPendingExchange({ status })).toBe(true);
    }
  });

  test("完了・却下・キャンセルは完了待ちに含めない", () => {
    const settled: ExchangeHistoryStatus[] = ["COMPLETED", "REJECTED", "CANCELED", "CANCELLED"];
    for (const status of settled) {
      expect(isSalesPendingExchange({ status })).toBe(false);
    }
    expect(isSalesPendingExchange({ status: undefined })).toBe(false);
  });
});

describe("summarizeSalesPendingExchanges", () => {
  test("完了待ちの交換だけを件数と交換相当額（1pt = 5円）にまとめ、ステータス別の内訳を持つ", () => {
    const summary = summarizeSalesPendingExchanges([
      { status: "REQUESTED", usedPoint: 100 },
      { status: "REQUESTED", usedPoint: 200 },
      { status: "PREPARING", usedPoint: 300 },
      { status: "IN_PROGRESS", usedPoint: 400 },
      { status: "COMPLETED", usedPoint: 1000 },
      { status: "REJECTED", usedPoint: 1000 },
      { status: "CANCELED", usedPoint: 1000 },
    ]);

    expect(summary.count).toBe(4);
    expect(summary.amountYen).toBe(5000);
    expect(summary.byStatus).toEqual({
      REQUESTED: { count: 2, amountYen: 1500 },
      PREPARING: { count: 1, amountYen: 1500 },
      IN_PROGRESS: { count: 1, amountYen: 2000 },
    });
  });

  test("完了待ちがなければすべて 0 になる", () => {
    const summary = summarizeSalesPendingExchanges([{ status: "COMPLETED", usedPoint: 100 }]);
    expect(summary.count).toBe(0);
    expect(summary.amountYen).toBe(0);
    expect(summary.byStatus.REQUESTED).toEqual({ count: 0, amountYen: 0 });
  });
});
