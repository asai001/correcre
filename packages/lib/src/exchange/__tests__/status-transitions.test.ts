// 交換ステータスの遷移可否は、誰が何をできるかを決める規則そのもの。
// うっかり広げると「提携企業が自分の売上を消せる」ような穴になるため、表を直接固定する。
import { canTransitionExchangeStatus, getAllowedNextExchangeStatuses } from "../status-transitions";

describe("getAllowedNextExchangeStatuses", () => {
  test("完了を取り消せるのは運用者だけ（不着・誤配送の救済経路）", () => {
    expect(getAllowedNextExchangeStatuses("COMPLETED", "OPERATOR")).toEqual(["CANCELED"]);
    expect(getAllowedNextExchangeStatuses("COMPLETED", "MERCHANT")).toEqual([]);
    expect(getAllowedNextExchangeStatuses("COMPLETED", "EMPLOYEE")).toEqual([]);
    expect(getAllowedNextExchangeStatuses("COMPLETED", "SYSTEM")).toEqual([]);
  });

  test("完了から完了以外の前工程には戻せない", () => {
    expect(canTransitionExchangeStatus("COMPLETED", "PREPARING", "OPERATOR")).toBe(false);
    expect(canTransitionExchangeStatus("COMPLETED", "IN_PROGRESS", "OPERATOR")).toBe(false);
    expect(canTransitionExchangeStatus("COMPLETED", "REJECTED", "OPERATOR")).toBe(false);
  });

  test("キャンセル・却下は終端のまま（復活させない）", () => {
    for (const actor of ["MERCHANT", "OPERATOR", "EMPLOYEE", "SYSTEM"] as const) {
      expect(getAllowedNextExchangeStatuses("CANCELED", actor)).toEqual([]);
      expect(getAllowedNextExchangeStatuses("REJECTED", actor)).toEqual([]);
    }
  });

  test("発送済みへ進められるのは提携企業と運用者だけ", () => {
    expect(canTransitionExchangeStatus("PREPARING", "IN_PROGRESS", "MERCHANT")).toBe(true);
    expect(canTransitionExchangeStatus("PREPARING", "IN_PROGRESS", "OPERATOR")).toBe(true);
    expect(canTransitionExchangeStatus("PREPARING", "IN_PROGRESS", "EMPLOYEE")).toBe(false);
  });
});
