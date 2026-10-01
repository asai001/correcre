import { InvalidExchangeStatusTransitionError } from "@correcre/lib/dynamodb/exchange-history";
import { InvalidShipmentInputError } from "@correcre/lib/shipment/tracking";
import type { MerchantUserItem } from "@correcre/types";

import type { MerchantSession } from "@merchant/lib/auth/verify-token";
import { jsonRequest, readJson, routeContext } from "@merchant/test-utils/http";

// 認可ゲートは差し替える。表示名・管理者判定は純粋関数なので本物を使う。
jest.mock("@merchant/lib/auth/merchant", () => ({
  getMerchantAccessStatus: jest.fn(),
  getMerchantViewerName: (user: MerchantUserItem) =>
    [user.lastName, user.firstName].filter(Boolean).join(" ") || user.email,
  isMerchantAdminUser: (user: MerchantUserItem) => user.roles.includes("MERCHANT_ADMIN"),
}));
jest.mock("@merchant/features/exchanges/api/server", () => ({
  transitionExchangeForMerchant: jest.fn(),
}));

import { transitionExchangeForMerchant } from "@merchant/features/exchanges/api/server";
import { getMerchantAccessStatus } from "@merchant/lib/auth/merchant";

import { POST } from "../route";

// 提携企業の POST /api/exchanges/[exchangeId]/transition。
// 自社宛ての交換申請を受付・発送・完了へ進める経路。他社の交換に触れないことが最重要。
const URL_ = "http://merchant.test/api/exchanges/exchange-1/transition";
const params = routeContext({ exchangeId: "exchange-1" });
const NOW = "2026-10-01T00:00:00.000Z";

const merchantUser: MerchantUserItem = {
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

const mockedAccess = jest.mocked(getMerchantAccessStatus);
const mockedTransition = jest.mocked(transitionExchangeForMerchant);

function allowAsMerchant(user: MerchantUserItem = merchantUser) {
  mockedAccess.mockResolvedValue({ allowed: true, session: {} as unknown as MerchantSession, user });
}

function post(body: unknown) {
  return POST(jsonRequest(URL_, { body }), params);
}

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedTransition.mockResolvedValue({ exchangeId: "exchange-1", status: "IN_PROGRESS" } as never);
});

describe("認可", () => {
  test("未ログインなら 401 unauthorized", async () => {
    mockedAccess.mockResolvedValue({ allowed: false, reason: "unauthenticated" });

    const response = await post({ nextStatus: "PREPARING" });

    expect(response.status).toBe(401);
    await expect(readJson(response)).resolves.toEqual({ error: "unauthorized" });
    expect(mockedTransition).not.toHaveBeenCalled();
  });

  test("提携企業ユーザーに紐付かないセッションは 403 merchant_only", async () => {
    mockedAccess.mockResolvedValue({ allowed: false, reason: "forbidden" });

    const response = await post({ nextStatus: "PREPARING" });

    expect(response.status).toBe(403);
    await expect(readJson(response)).resolves.toEqual({ error: "merchant_only" });
    expect(mockedTransition).not.toHaveBeenCalled();
  });
});

describe("テナント境界", () => {
  test("対象の提携企業はセッションのユーザーの所属で確定し、ボディで他社を指定しても使われない", async () => {
    allowAsMerchant();

    const response = await post({ nextStatus: "PREPARING", merchantId: "other-merchant", actorUserId: "someone" });

    expect(response.status).toBe(200);
    expect(mockedTransition).toHaveBeenCalledTimes(1);
    expect(mockedTransition).toHaveBeenCalledWith({
      merchantId: "merchant-1",
      exchangeId: "exchange-1",
      actorUserId: "merchant-user-1",
      actorName: "山田 花子",
      nextStatus: "PREPARING",
      comment: undefined,
      shipment: undefined,
    });
  });
});

describe("入力検証", () => {
  test("壊れた JSON は 400 invalid_json", async () => {
    allowAsMerchant();

    const response = await POST(jsonRequest(URL_, { rawBody: "{" }), params);

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toEqual({ error: "invalid_json" });
    expect(mockedTransition).not.toHaveBeenCalled();
  });

  test.each([undefined, "CANCELLED", "DONE", 1])("nextStatus が許可された値でなければ 400 invalid_status (%p)", async (nextStatus) => {
    allowAsMerchant();

    const response = await post({ nextStatus });

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toEqual({ error: "invalid_status" });
    expect(mockedTransition).not.toHaveBeenCalled();
  });
});

describe("発送情報とエラーの対応", () => {
  test("発送済みへ進める際の発送情報とコメントはそのまま渡す", async () => {
    allowAsMerchant();
    const shipment = { carrier: "YAMATO", trackingNumber: "1234-5678-9012" };

    await post({ nextStatus: "IN_PROGRESS", shipment, comment: "本日発送しました" });

    expect(mockedTransition).toHaveBeenCalledWith(
      expect.objectContaining({ nextStatus: "IN_PROGRESS", shipment, comment: "本日発送しました" }),
    );
  });

  test("遷移表で許されない遷移は 400 invalid_transition", async () => {
    allowAsMerchant();
    mockedTransition.mockRejectedValue(new InvalidExchangeStatusTransitionError("COMPLETED", "CANCELED", "MERCHANT"));

    const response = await post({ nextStatus: "CANCELED" });

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toEqual({ error: "invalid_transition" });
  });

  test("発送情報の入力エラーは文言をそのまま 400 で返す", async () => {
    allowAsMerchant();
    mockedTransition.mockRejectedValue(new InvalidShipmentInputError("送り状番号は数字で入力してください"));

    const response = await post({ nextStatus: "IN_PROGRESS", shipment: { carrier: "YAMATO", trackingNumber: "abc" } });

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toEqual({ error: "送り状番号は数字で入力してください" });
  });
});
