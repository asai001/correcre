// 売上は申請時ではなく完了時に、完了した月で計上する（2026-10-14 定例で合意）。
import type { ExchangeHistoryStatus } from "@correcre/types";

import { getSalesRecognitionMonth, isSalesRecognizedExchange } from "../sales-recognition";

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
