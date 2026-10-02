import type { DBUserItem } from "@correcre/types";

import { rejectForeignCompanyQuery } from "../api-authorize";

// 管理者の読み取り系 API に共通する「対象企業はセッションの所属企業」の判定。
const adminUser = { companyId: "company-1", userId: "admin-1", roles: ["ADMIN"], status: "ACTIVE" } as DBUserItem;

describe("rejectForeignCompanyQuery", () => {
  test("companyId が無ければ通す（セッションの所属企業を使う）", () => {
    expect(rejectForeignCompanyQuery(new URLSearchParams(""), adminUser)).toBeNull();
    expect(rejectForeignCompanyQuery(new URLSearchParams("userId=x"), adminUser)).toBeNull();
  });

  test("自社の companyId なら通す", () => {
    expect(rejectForeignCompanyQuery(new URLSearchParams("companyId=company-1"), adminUser)).toBeNull();
  });

  test("別企業の companyId は 403 forbidden", async () => {
    const response = rejectForeignCompanyQuery(new URLSearchParams("companyId=company-2"), adminUser);

    expect(response?.status).toBe(403);
    await expect(response!.json()).resolves.toEqual({ error: "forbidden" });
  });

  test("空文字の companyId は未指定として扱う", () => {
    expect(rejectForeignCompanyQuery(new URLSearchParams("companyId="), adminUser)).toBeNull();
  });
});
