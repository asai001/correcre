import type { ExchangeHistoryActorType, ExchangeHistoryStatus } from "@correcre/types";
import { describe, expect, test } from "vitest";

import { canTransitionExchangeStatus, getAllowedNextExchangeStatuses } from "./exchange-history";

// 交換ステータスの遷移表は、employee が作った交換申請を merchant / operator が進める
// アプリ横断の契約そのもの。DynamoDB には触らず、遷移表だけを検証する。
const ALL_STATUSES: ExchangeHistoryStatus[] = [
  "REQUESTED",
  "PREPARING",
  "IN_PROGRESS",
  "COMPLETED",
  "REJECTED",
  "CANCELED",
  "CANCELLED",
];
const TERMINAL_STATUSES: ExchangeHistoryStatus[] = ["COMPLETED", "REJECTED", "CANCELED", "CANCELLED"];
const ALL_ACTORS: ExchangeHistoryActorType[] = ["EMPLOYEE", "MERCHANT", "OPERATOR", "SYSTEM"];

describe("getAllowedNextExchangeStatuses", () => {
  test("REQUESTED からは 受付(PREPARING)・却下・キャンセル へ進める", () => {
    for (const actor of ["MERCHANT", "OPERATOR"] as const) {
      expect(getAllowedNextExchangeStatuses("REQUESTED", actor)).toEqual(["PREPARING", "REJECTED", "CANCELED"]);
    }
  });

  test("PREPARING からは 対応中(IN_PROGRESS)・キャンセル へ進める", () => {
    for (const actor of ["MERCHANT", "OPERATOR"] as const) {
      expect(getAllowedNextExchangeStatuses("PREPARING", actor)).toEqual(["IN_PROGRESS", "CANCELED"]);
    }
  });

  test("IN_PROGRESS からは 完了 か PREPARING への差し戻しのみ（キャンセル不可）", () => {
    for (const actor of ["MERCHANT", "OPERATOR"] as const) {
      expect(getAllowedNextExchangeStatuses("IN_PROGRESS", actor)).toEqual(["COMPLETED", "PREPARING"]);
    }
  });

  test("merchant と operator は同じ権限を持つ", () => {
    for (const from of ALL_STATUSES) {
      expect(getAllowedNextExchangeStatuses(from, "MERCHANT")).toEqual(
        getAllowedNextExchangeStatuses(from, "OPERATOR"),
      );
    }
  });

  test("従業員と SYSTEM はどの状態からも遷移させられない", () => {
    for (const from of ALL_STATUSES) {
      expect(getAllowedNextExchangeStatuses(from, "EMPLOYEE")).toEqual([]);
      expect(getAllowedNextExchangeStatuses(from, "SYSTEM")).toEqual([]);
    }
  });

  test("終端状態からはどのアクターも遷移できない", () => {
    for (const from of TERMINAL_STATUSES) {
      for (const actor of ALL_ACTORS) {
        expect(getAllowedNextExchangeStatuses(from, actor)).toEqual([]);
      }
    }
  });

  test("新規の遷移先には英式綴りの CANCELLED を使わない（CANCELLED は旧データ読み取り専用）", () => {
    for (const from of ALL_STATUSES) {
      for (const actor of ALL_ACTORS) {
        expect(getAllowedNextExchangeStatuses(from, actor)).not.toContain("CANCELLED");
      }
    }
  });
});

describe("canTransitionExchangeStatus", () => {
  test("許可された遷移は true", () => {
    expect(canTransitionExchangeStatus("REQUESTED", "PREPARING", "MERCHANT")).toBe(true);
    expect(canTransitionExchangeStatus("PREPARING", "IN_PROGRESS", "OPERATOR")).toBe(true);
    expect(canTransitionExchangeStatus("IN_PROGRESS", "COMPLETED", "MERCHANT")).toBe(true);
    expect(canTransitionExchangeStatus("IN_PROGRESS", "PREPARING", "MERCHANT")).toBe(true);
  });

  test("段階を飛ばす遷移は false", () => {
    expect(canTransitionExchangeStatus("REQUESTED", "IN_PROGRESS", "MERCHANT")).toBe(false);
    expect(canTransitionExchangeStatus("REQUESTED", "COMPLETED", "OPERATOR")).toBe(false);
    expect(canTransitionExchangeStatus("PREPARING", "COMPLETED", "MERCHANT")).toBe(false);
  });

  test("同じ状態への遷移は false", () => {
    for (const status of ALL_STATUSES) {
      for (const actor of ALL_ACTORS) {
        expect(canTransitionExchangeStatus(status, status, actor)).toBe(false);
      }
    }
  });

  test("完了後の取り消しや却下は false", () => {
    expect(canTransitionExchangeStatus("COMPLETED", "CANCELED", "OPERATOR")).toBe(false);
    expect(canTransitionExchangeStatus("COMPLETED", "REJECTED", "MERCHANT")).toBe(false);
    expect(canTransitionExchangeStatus("REJECTED", "REQUESTED", "OPERATOR")).toBe(false);
  });

  test("従業員は自分の申請を進められない", () => {
    expect(canTransitionExchangeStatus("REQUESTED", "CANCELED", "EMPLOYEE")).toBe(false);
    expect(canTransitionExchangeStatus("REQUESTED", "PREPARING", "EMPLOYEE")).toBe(false);
  });
});
