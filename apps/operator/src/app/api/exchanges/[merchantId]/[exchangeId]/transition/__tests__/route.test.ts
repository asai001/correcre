import { InvalidExchangeStatusTransitionError } from "@correcre/lib/dynamodb/exchange-history";
import type { DBUserItem } from "@correcre/types";

import type { OperatorSession } from "@operator/lib/auth/verify-token";
import { jsonRequest, readJson, routeContext } from "@operator/test-utils/http";

jest.mock("@operator/lib/auth/operator", () => ({ getOperatorAccessStatus: jest.fn() }));
jest.mock("@operator/features/exchange-management/api/server", () => ({
  transitionExchangeForOperator: jest.fn(),
}));

import { transitionExchangeForOperator } from "@operator/features/exchange-management/api/server";
import { getOperatorAccessStatus } from "@operator/lib/auth/operator";

import { POST } from "../route";

// 運用者の POST /api/exchanges/[merchantId]/[exchangeId]/transition。
// 提携企業の代わりに交換のステータスを進める・却下する・完了を取り消す経路。
const URL_ = "http://operator.test/api/exchanges/merchant-1/exchange-1/transition";
const params = routeContext({ merchantId: "merchant-1", exchangeId: "exchange-1" });

const operatorUser = {
  companyId: "operator-company",
  userId: "operator-1",
  lastName: "運用",
  firstName: "太郎",
  email: "operator@example.com",
  roles: ["OPERATOR"],
  status: "ACTIVE",
} as DBUserItem;

const mockedAccess = jest.mocked(getOperatorAccessStatus);
const mockedTransition = jest.mocked(transitionExchangeForOperator);

function allowAsOperator(user: DBUserItem = operatorUser) {
  mockedAccess.mockResolvedValue({ allowed: true, session: {} as unknown as OperatorSession, user });
}

function post(body: unknown) {
  return POST(jsonRequest(URL_, { body }), params);
}

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedTransition.mockResolvedValue({ exchangeId: "exchange-1", status: "PREPARING" } as never);
});

describe("認可", () => {
  test("未ログインなら 401 unauthorized", async () => {
    mockedAccess.mockResolvedValue({ allowed: false, reason: "unauthenticated" });

    const response = await post({ nextStatus: "PREPARING" });

    expect(response.status).toBe(401);
    await expect(readJson(response)).resolves.toEqual({ error: "unauthorized" });
    expect(mockedTransition).not.toHaveBeenCalled();
  });

  test("ログイン済みでも運用者ロールが無ければ 403 operator_only", async () => {
    mockedAccess.mockResolvedValue({ allowed: false, reason: "forbidden" });

    const response = await post({ nextStatus: "PREPARING" });

    expect(response.status).toBe(403);
    await expect(readJson(response)).resolves.toEqual({ error: "operator_only" });
    expect(mockedTransition).not.toHaveBeenCalled();
  });
});

describe("入力検証", () => {
  test("壊れた JSON は 400 invalid_json", async () => {
    allowAsOperator();

    const response = await POST(jsonRequest(URL_, { rawBody: "{" }), params);

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toEqual({ error: "invalid_json" });
    expect(mockedTransition).not.toHaveBeenCalled();
  });

  test.each([undefined, null, 42, "SHIPPED", "CANCELLED", "requested"])(
    "nextStatus が許可された値でなければ 400 invalid_status (%p)",
    async (nextStatus) => {
      allowAsOperator();

      const response = await post({ nextStatus });

      expect(response.status).toBe(400);
      await expect(readJson(response)).resolves.toEqual({ error: "invalid_status" });
      expect(mockedTransition).not.toHaveBeenCalled();
    },
  );
});

describe("遷移の実行", () => {
  test("対象はパスの merchantId / exchangeId、操作者はセッションのユーザーで確定する", async () => {
    allowAsOperator();

    const response = await post({
      nextStatus: "PREPARING",
      comment: "受付しました",
      // ボディで別の操作者や対象を名乗っても使われない
      merchantId: "other-merchant",
      exchangeId: "other-exchange",
      actorUserId: "someone-else",
    });

    expect(response.status).toBe(200);
    expect(mockedTransition).toHaveBeenCalledTimes(1);
    expect(mockedTransition).toHaveBeenCalledWith({
      merchantId: "merchant-1",
      exchangeId: "exchange-1",
      actorUserId: "operator-1",
      actorName: "運用 太郎",
      nextStatus: "PREPARING",
      comment: "受付しました",
    });
    await expect(readJson(response)).resolves.toEqual({ exchangeId: "exchange-1", status: "PREPARING" });
  });

  test("氏名が無い運用者はメールアドレスを操作者名にする", async () => {
    allowAsOperator({ ...operatorUser, lastName: "", firstName: "" });

    await post({ nextStatus: "PREPARING" });

    expect(mockedTransition).toHaveBeenCalledWith(expect.objectContaining({ actorName: "operator@example.com" }));
  });

  test("遷移表で許されない遷移は 400 invalid_transition", async () => {
    allowAsOperator();
    mockedTransition.mockRejectedValue(new InvalidExchangeStatusTransitionError("REQUESTED", "COMPLETED", "OPERATOR"));

    const response = await post({ nextStatus: "COMPLETED" });

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toEqual({ error: "invalid_transition" });
  });

  test("業務エラーはメッセージ付きの 400", async () => {
    allowAsOperator();
    mockedTransition.mockRejectedValue(new Error("対象の交換が見つかりません"));

    const response = await post({ nextStatus: "PREPARING" });

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toEqual({ error: "対象の交換が見つかりません" });
  });
});
