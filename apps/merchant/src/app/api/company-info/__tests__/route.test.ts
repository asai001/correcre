import type { MerchantUserItem } from "@correcre/types";

import type { MerchantSession } from "@merchant/lib/auth/verify-token";
import { jsonRequest, readJson } from "@merchant/test-utils/http";

jest.mock("@merchant/lib/auth/merchant", () => ({
  getMerchantAccessStatus: jest.fn(),
  isMerchantAdminUser: (user: MerchantUserItem) => user.roles.includes("MERCHANT_ADMIN"),
}));
// index.ts は UI コンポーネントも再エクスポートしているため、必要な関数だけの差し替えにする。
jest.mock("@merchant/features/company-info", () => ({
  updateMerchantCompanyInfo: jest.fn(),
}));

import { updateMerchantCompanyInfo } from "@merchant/features/company-info";
import { getMerchantAccessStatus } from "@merchant/lib/auth/merchant";

import { PATCH } from "../route";

// 提携企業の PATCH /api/company-info。会社情報（請求先・振込先など）の変更は
// 提携企業内の管理者ロール（MERCHANT_ADMIN）に限られる。
const URL_ = "http://merchant.test/api/company-info";
const NOW = "2026-10-01T00:00:00.000Z";

const baseUser: MerchantUserItem = {
  merchantId: "merchant-1",
  sk: "USER#merchant-user-1",
  userId: "merchant-user-1",
  lastName: "山田",
  firstName: "花子",
  email: "hanako@example.com",
  roles: ["MERCHANT"],
  status: "ACTIVE",
  createdAt: NOW,
  updatedAt: NOW,
  gsi2pk: "EMAIL#hanako@example.com",
};
const adminUser: MerchantUserItem = { ...baseUser, roles: ["MERCHANT", "MERCHANT_ADMIN"] };

const mockedAccess = jest.mocked(getMerchantAccessStatus);
const mockedUpdate = jest.mocked(updateMerchantCompanyInfo);

function allowAs(user: MerchantUserItem) {
  mockedAccess.mockResolvedValue({ allowed: true, session: {} as unknown as MerchantSession, user });
}

function patch(body: unknown) {
  return PATCH(jsonRequest(URL_, { method: "PATCH", body }));
}

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedUpdate.mockResolvedValue({ merchantId: "merchant-1", name: "更新後" } as never);
});

test("未ログインなら 401 unauthorized", async () => {
  mockedAccess.mockResolvedValue({ allowed: false, reason: "unauthenticated" });

  const response = await patch({ name: "新社名" });

  expect(response.status).toBe(401);
  await expect(readJson(response)).resolves.toEqual({ error: "unauthorized" });
  expect(mockedUpdate).not.toHaveBeenCalled();
});

test("提携企業ユーザーに紐付かないセッションは 403 admin_only", async () => {
  mockedAccess.mockResolvedValue({ allowed: false, reason: "forbidden" });

  const response = await patch({ name: "新社名" });

  expect(response.status).toBe(403);
  await expect(readJson(response)).resolves.toEqual({ error: "admin_only" });
  expect(mockedUpdate).not.toHaveBeenCalled();
});

test("一般ユーザー（MERCHANT のみ）は 403 admin_only で会社情報を変更できない", async () => {
  allowAs(baseUser);

  const response = await patch({ name: "新社名" });

  expect(response.status).toBe(403);
  await expect(readJson(response)).resolves.toEqual({ error: "admin_only" });
  expect(mockedUpdate).not.toHaveBeenCalled();
});

test("管理者ロールなら更新でき、対象はセッションの所属企業に固定される", async () => {
  allowAs(adminUser);
  const body = { name: "新社名", merchantId: "other-merchant" };

  const response = await patch(body);

  expect(response.status).toBe(200);
  expect(mockedUpdate).toHaveBeenCalledTimes(1);
  expect(mockedUpdate).toHaveBeenCalledWith("merchant-1", body);
  await expect(readJson(response)).resolves.toEqual({ merchantId: "merchant-1", name: "更新後" });
});

test("壊れた JSON は 400 invalid_json、null は 400 invalid_body", async () => {
  allowAs(adminUser);

  const broken = await PATCH(jsonRequest(URL_, { method: "PATCH", rawBody: "{" }));
  expect(broken.status).toBe(400);
  await expect(readJson(broken)).resolves.toEqual({ error: "invalid_json" });

  const empty = await patch(null);
  expect(empty.status).toBe(400);
  await expect(readJson(empty)).resolves.toEqual({ error: "invalid_body" });

  expect(mockedUpdate).not.toHaveBeenCalled();
});

test("業務エラーはメッセージ付きの 400", async () => {
  allowAs(adminUser);
  mockedUpdate.mockRejectedValue(new Error("会社名は必須です"));

  const response = await patch({ name: "" });

  expect(response.status).toBe(400);
  await expect(readJson(response)).resolves.toEqual({ error: "会社名は必須です" });
});
