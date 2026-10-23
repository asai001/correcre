import { InsufficientPointBalanceError } from "@correcre/lib/dynamodb/exchange-history";
import type { DBUserItem } from "@correcre/types";

import { jsonRequest, readJson, routeContext } from "@employee/test-utils/http";

jest.mock("@employee/lib/auth/current-user", () => ({ requireCurrentEmployeeUser: jest.fn() }));
// 機能層は UI パッケージまで引き込むため、Route Handler が instanceof で見るエラー型だけ同名で定義する。
jest.mock("@employee/features/exchange/api/server", () => {
  class MerchandiseUnavailableError extends Error {
    constructor(message = "対象の商品は現在交換できません") {
      super(message);
      this.name = "MerchandiseUnavailableError";
    }
  }
  class IncompleteExchangeProfileError extends Error {
    constructor(message = "連絡先を登録してから申請してください") {
      super(message);
      this.name = "IncompleteExchangeProfileError";
    }
  }
  return { MerchandiseUnavailableError, IncompleteExchangeProfileError, requestExchangeForEmployee: jest.fn() };
});

import {
  IncompleteExchangeProfileError,
  MerchandiseUnavailableError,
  requestExchangeForEmployee,
} from "@employee/features/exchange/api/server";
import { requireCurrentEmployeeUser } from "@employee/lib/auth/current-user";

import { POST } from "../route";

// 従業員の POST /api/exchange/[merchandiseId]/request。ポイントを消費して商品交換を申請する。
// 消費元の従業員はセッションから決まり、ボディで他人を指定できてはいけない。
const URL_ = "http://employee.test/api/exchange/merchandise-1/request";
const params = routeContext({ merchandiseId: "merchandise-1" });

const employee = { companyId: "company-1", userId: "employee-1", roles: ["EMPLOYEE"], status: "ACTIVE" } as DBUserItem;

const mockedRequireUser = jest.mocked(requireCurrentEmployeeUser);
const mockedRequest = jest.mocked(requestExchangeForEmployee);

function post(body: unknown) {
  return POST(jsonRequest(URL_, { body }), params);
}

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedRequireUser.mockResolvedValue(employee);
  mockedRequest.mockResolvedValue({ exchangeId: "exchange-1", status: "REQUESTED" } as never);
});

describe("認可", () => {
  test("未ログイン（セッション解決が失敗）なら申請処理を呼ばず、成功以外のステータスを返す", async () => {
    // requireCurrentEmployeeUser は未ログイン時に redirect() を投げる。Route Handler はそれを捕まえて
    // エラー応答にするため、ここでは「申請が実行されないこと」と「2xx でないこと」を固定する。
    const redirectError = new Error("NEXT_REDIRECT");
    redirectError.name = "NEXT_REDIRECT";
    mockedRequireUser.mockRejectedValue(redirectError);

    const response = await post({ merchantId: "merchant-1" });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(mockedRequest).not.toHaveBeenCalled();
  });
});

describe("テナント境界", () => {
  test("申請者はセッションの従業員で確定し、ボディの companyId / userId は無視される", async () => {
    const response = await post({ merchantId: "  merchant-1  ", companyId: "other-company", userId: "other-user" });

    expect(response.status).toBe(201);
    expect(mockedRequest).toHaveBeenCalledTimes(1);
    expect(mockedRequest).toHaveBeenCalledWith({
      companyId: "company-1",
      userId: "employee-1",
      merchantId: "merchant-1",
      merchandiseId: "merchandise-1",
    });
    await expect(readJson(response)).resolves.toEqual({ exchangeId: "exchange-1", status: "REQUESTED" });
  });
});

describe("入力検証", () => {
  test("壊れた JSON は 400 invalid_json", async () => {
    const response = await POST(jsonRequest(URL_, { rawBody: "{" }), params);

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toEqual({ error: "invalid_json" });
    expect(mockedRequest).not.toHaveBeenCalled();
  });

  test.each([{}, { merchantId: "" }, { merchantId: "   " }, { merchantId: 123 }])(
    "merchantId が空または文字列でなければ 400 (%p)",
    async (body) => {
      const response = await post(body);

      expect(response.status).toBe(400);
      expect(mockedRequest).not.toHaveBeenCalled();
    },
  );
});

describe("業務エラーの対応", () => {
  test("残高不足は 400 insufficient_point_balance", async () => {
    mockedRequest.mockRejectedValue(new InsufficientPointBalanceError());

    const response = await post({ merchantId: "merchant-1" });

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toMatchObject({ error: "insufficient_point_balance" });
  });

  test("交換不可の商品は 400 merchandise_unavailable", async () => {
    mockedRequest.mockRejectedValue(new MerchandiseUnavailableError("対象の商品は現在交換できません"));

    const response = await post({ merchantId: "merchant-1" });

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toMatchObject({ error: "merchandise_unavailable" });
  });

  test("連絡先未登録は 400 incomplete_exchange_profile", async () => {
    mockedRequest.mockRejectedValue(new IncompleteExchangeProfileError("連絡先を登録してから申請してください"));

    const response = await post({ merchantId: "merchant-1" });

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toMatchObject({ error: "incomplete_exchange_profile" });
  });

  test("想定外のエラーは内部情報を出さず 500 internal_error", async () => {
    mockedRequest.mockRejectedValue(new Error("DynamoDB の内部的な失敗"));

    const response = await post({ merchantId: "merchant-1" });

    expect(response.status).toBe(500);
    await expect(readJson(response)).resolves.toEqual({ error: "internal_error" });
  });
});
