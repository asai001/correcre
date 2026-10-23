import type { DBUserItem } from "@correcre/types";

import type { OperatorSession } from "@operator/lib/auth/verify-token";
import { jsonRequest, readJson, routeContext } from "@operator/test-utils/http";

jest.mock("@operator/lib/auth/operator", () => ({ getOperatorAccessStatus: jest.fn() }));
jest.mock("@operator/features/merchant-management/api/server", () => ({
  updateMerchantUserRoleForOperator: jest.fn(),
}));

import { updateMerchantUserRoleForOperator } from "@operator/features/merchant-management/api/server";
import { getOperatorAccessStatus } from "@operator/lib/auth/operator";

import { PATCH } from "../route";

// 運用者の PATCH /api/merchants/[merchantId]/users/[userId]/role。
// 提携企業ユーザーに MERCHANT_ADMIN を付与・剥奪する、権限そのものを動かす API。
const URL_ = "http://operator.test/api/merchants/merchant-1/users/user-1/role";
const params = routeContext({ merchantId: "merchant-1", userId: "user-1" });

const operatorUser = { userId: "operator-1", roles: ["OPERATOR"], status: "ACTIVE" } as DBUserItem;

const mockedAccess = jest.mocked(getOperatorAccessStatus);
const mockedUpdateRole = jest.mocked(updateMerchantUserRoleForOperator);

function allowAsOperator() {
  mockedAccess.mockResolvedValue({ allowed: true, session: {} as unknown as OperatorSession, user: operatorUser });
}

function patch(body: unknown) {
  return PATCH(jsonRequest(URL_, { method: "PATCH", body }), params);
}

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedUpdateRole.mockResolvedValue({ userId: "user-1", isAdmin: true } as never);
});

test("未ログインなら 401、運用者ロール無しなら 403。いずれもロールは変更しない", async () => {
  mockedAccess.mockResolvedValue({ allowed: false, reason: "unauthenticated" });
  expect((await patch({ isAdmin: true })).status).toBe(401);

  mockedAccess.mockResolvedValue({ allowed: false, reason: "forbidden" });
  const forbidden = await patch({ isAdmin: true });
  expect(forbidden.status).toBe(403);
  await expect(readJson(forbidden)).resolves.toEqual({ error: "operator_only" });

  expect(mockedUpdateRole).not.toHaveBeenCalled();
});

test.each([{}, { isAdmin: "true" }, { isAdmin: 1 }, { isAdmin: null }, null])(
  "isAdmin が真偽値でなければ 400 invalid_body (%p)",
  async (body) => {
    allowAsOperator();

    const response = await patch(body);

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toEqual({ error: "invalid_body" });
    expect(mockedUpdateRole).not.toHaveBeenCalled();
  },
);

test("壊れた JSON は 400 invalid_json", async () => {
  allowAsOperator();

  const response = await PATCH(jsonRequest(URL_, { method: "PATCH", rawBody: "not json" }), params);

  expect(response.status).toBe(400);
  await expect(readJson(response)).resolves.toEqual({ error: "invalid_json" });
});

test("対象ユーザーはパスの merchantId / userId で確定し、ボディの指定は無視される", async () => {
  allowAsOperator();

  const response = await patch({ isAdmin: false, merchantId: "other-merchant", userId: "other-user" });

  expect(response.status).toBe(200);
  expect(mockedUpdateRole).toHaveBeenCalledTimes(1);
  expect(mockedUpdateRole).toHaveBeenCalledWith({ merchantId: "merchant-1", userId: "user-1", isAdmin: false });
});

test("対象ユーザーが見つからなければ 404", async () => {
  allowAsOperator();
  mockedUpdateRole.mockRejectedValue(new Error("対象のユーザーが見つかりません"));

  const response = await patch({ isAdmin: true });

  expect(response.status).toBe(404);
  await expect(readJson(response)).resolves.toEqual({ error: "対象のユーザーが見つかりません" });
});

test("その他の業務エラーは 400", async () => {
  allowAsOperator();
  mockedUpdateRole.mockRejectedValue(new Error("最後の管理者からは権限を外せません"));

  const response = await patch({ isAdmin: false });

  expect(response.status).toBe(400);
});
