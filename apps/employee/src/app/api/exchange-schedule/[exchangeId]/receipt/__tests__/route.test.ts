import { InvalidExchangeStatusTransitionError } from "@correcre/lib/dynamodb/exchange-history";
import type { DBUserItem } from "@correcre/types";

import { jsonRequest, readJson, routeContext } from "@employee/test-utils/http";

jest.mock("@employee/lib/auth/current-user", () => ({ requireCurrentEmployeeUser: jest.fn() }));
// エラー型は route-helpers が instanceof で参照するため本物を残し、DB へ出る関数だけ差し替える。
jest.mock("@employee/features/exchange-schedule/api/server", () => ({
  ...jest.requireActual("@employee/features/exchange-schedule/api/server"),
  confirmReceiptForEmployee: jest.fn(),
}));

import { ExchangeScheduleNotFoundError, confirmReceiptForEmployee } from "@employee/features/exchange-schedule/api/server";
import { requireCurrentEmployeeUser } from "@employee/lib/auth/current-user";

import { POST } from "../route";

// 従業員の POST /api/exchange-schedule/[exchangeId]/receipt。受取確認で交換を完了にする。
// 「誰の交換か」の検証は機能層（自分の履歴から探す）に委ねており、ここではセッションのユーザーが渡ることを固定する。
const URL_ = "http://employee.test/api/exchange-schedule/exchange-1/receipt";
const params = routeContext({ exchangeId: "exchange-1" });

const employee = { companyId: "company-1", userId: "employee-1", roles: ["EMPLOYEE"], status: "ACTIVE" } as DBUserItem;

const mockedRequireUser = jest.mocked(requireCurrentEmployeeUser);
const mockedConfirm = jest.mocked(confirmReceiptForEmployee);

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedRequireUser.mockResolvedValue(employee);
  mockedConfirm.mockResolvedValue({ exchangeId: "exchange-1", status: "COMPLETED" } as never);
});

test("未ログイン（セッション解決が失敗）なら受取確認を実行せず、成功以外のステータスを返す", async () => {
  const redirectError = new Error("NEXT_REDIRECT");
  redirectError.name = "NEXT_REDIRECT";
  mockedRequireUser.mockRejectedValue(redirectError);

  const response = await POST(jsonRequest(URL_, { method: "POST" }), params);

  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(mockedConfirm).not.toHaveBeenCalled();
});

test("セッションの従業員とパスの exchangeId で受取確認を実行する", async () => {
  const response = await POST(jsonRequest(URL_, { method: "POST" }), params);

  expect(response.status).toBe(200);
  expect(mockedConfirm).toHaveBeenCalledTimes(1);
  expect(mockedConfirm).toHaveBeenCalledWith(employee, "exchange-1");
  await expect(readJson(response)).resolves.toEqual({ exchangeId: "exchange-1", status: "COMPLETED" });
});

test("自分の履歴に無い交換（他人の交換を含む）は 404 not_found", async () => {
  mockedConfirm.mockRejectedValue(new ExchangeScheduleNotFoundError());

  const response = await POST(jsonRequest(URL_, { method: "POST" }), params);

  expect(response.status).toBe(404);
  await expect(readJson(response)).resolves.toMatchObject({ error: "not_found" });
});

test("発送済みでない交換の受取確認は 400 invalid_transition", async () => {
  mockedConfirm.mockRejectedValue(new InvalidExchangeStatusTransitionError("PREPARING", "COMPLETED", "EMPLOYEE"));

  const response = await POST(jsonRequest(URL_, { method: "POST" }), params);

  expect(response.status).toBe(400);
  await expect(readJson(response)).resolves.toEqual({ error: "invalid_transition" });
});

test("想定外のエラーは内部情報を出さず 500 internal_error", async () => {
  mockedConfirm.mockRejectedValue(new Error("DynamoDB の内部的な失敗"));

  const response = await POST(jsonRequest(URL_, { method: "POST" }), params);

  expect(response.status).toBe(500);
  await expect(readJson(response)).resolves.toEqual({ error: "internal_error" });
});
