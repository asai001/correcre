import type { ExchangeHistoryStatus } from "@correcre/types";

import { canTransitionExchangeStatus } from "../../exchange/status-transitions";
import {
  isMerchantDeletionConfirmed,
  isOpenExchangeForMerchantDeletion,
  planMerchantDeletionCancellation,
} from "../deletion";

describe("isOpenExchangeForMerchantDeletion", () => {
  test("申請中・準備中・発送済みは対応中として削除前の確認対象にする", () => {
    for (const status of ["REQUESTED", "PREPARING", "IN_PROGRESS", undefined] as const) {
      expect(isOpenExchangeForMerchantDeletion({ status })).toBe(true);
    }
  });

  test("完了・却下・キャンセルは履歴として残すだけで、削除を止めない", () => {
    for (const status of ["COMPLETED", "REJECTED", "CANCELED", "CANCELLED"] as const) {
      expect(isOpenExchangeForMerchantDeletion({ status })).toBe(false);
    }
  });
});

describe("planMerchantDeletionCancellation", () => {
  test("運用者の遷移規則の範囲でキャンセルまで辿り着ける", () => {
    const open: ExchangeHistoryStatus[] = ["REQUESTED", "PREPARING", "IN_PROGRESS"];
    for (const from of open) {
      const steps = planMerchantDeletionCancellation(from);
      expect(steps[steps.length - 1]).toBe("CANCELED");

      let current = from;
      for (const next of steps) {
        expect(canTransitionExchangeStatus(current, next, "OPERATOR")).toBe(true);
        current = next;
      }
    }
  });

  test("発送済みは準備中に戻してからキャンセルする", () => {
    expect(planMerchantDeletionCancellation("IN_PROGRESS")).toEqual(["PREPARING", "CANCELED"]);
  });

  test("完了・終端の交換には何もしない（完了済みの売上は取り消さない）", () => {
    for (const status of ["COMPLETED", "REJECTED", "CANCELED", "CANCELLED"] as const) {
      expect(planMerchantDeletionCancellation(status)).toEqual([]);
    }
  });
});

describe("isMerchantDeletionConfirmed", () => {
  test("提携企業名と一致したときだけ削除を受け付ける", () => {
    expect(isMerchantDeletionConfirmed("DIALOGUE Cosmetics", "DIALOGUE Cosmetics")).toBe(true);
    expect(isMerchantDeletionConfirmed("DIALOGUE Cosmetics", "  DIALOGUE Cosmetics ")).toBe(true);
    expect(isMerchantDeletionConfirmed("DIALOGUE Cosmetics", "dialogue cosmetics")).toBe(false);
    expect(isMerchantDeletionConfirmed("DIALOGUE Cosmetics", "")).toBe(false);
    expect(isMerchantDeletionConfirmed("DIALOGUE Cosmetics", undefined)).toBe(false);
  });
});
