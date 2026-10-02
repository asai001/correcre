import type { DBUserItem } from "@correcre/types";

import { rejectForeignScopeQuery } from "../api-authorize";

// 従業員の読み取り系 API に共通する「対象は本人（所属企業・自分自身）」の判定。
const employee = { companyId: "company-1", userId: "employee-1", roles: ["EMPLOYEE"], status: "ACTIVE" } as DBUserItem;

describe("rejectForeignScopeQuery", () => {
  test("companyId / userId が無ければ通す（セッションの本人を使う）", () => {
    expect(rejectForeignScopeQuery(new URLSearchParams(""), employee)).toBeNull();
    expect(rejectForeignScopeQuery(new URLSearchParams("limit=5"), employee)).toBeNull();
  });

  test("自社かつ自分自身なら通す", () => {
    expect(rejectForeignScopeQuery(new URLSearchParams("companyId=company-1&userId=employee-1"), employee)).toBeNull();
  });

  test("別企業の companyId は 403 forbidden", async () => {
    const response = rejectForeignScopeQuery(new URLSearchParams("companyId=company-2&userId=employee-1"), employee);

    expect(response?.status).toBe(403);
    await expect(response!.json()).resolves.toEqual({ error: "forbidden" });
  });

  test("同じ企業でも別ユーザーの userId は 403 forbidden", async () => {
    const response = rejectForeignScopeQuery(new URLSearchParams("companyId=company-1&userId=employee-2"), employee);

    expect(response?.status).toBe(403);
    await expect(response!.json()).resolves.toEqual({ error: "forbidden" });
  });

  test("checkUserId: false なら userId は見ない（企業単位のルート向け）", () => {
    expect(
      rejectForeignScopeQuery(new URLSearchParams("companyId=company-1&userId=employee-2"), employee, { checkUserId: false }),
    ).toBeNull();
    expect(
      rejectForeignScopeQuery(new URLSearchParams("companyId=company-2"), employee, { checkUserId: false })?.status,
    ).toBe(403);
  });
});
