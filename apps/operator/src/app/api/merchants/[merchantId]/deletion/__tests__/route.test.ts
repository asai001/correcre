import type { DBUserItem } from "@correcre/types";

import type { OperatorSession } from "@operator/lib/auth/verify-token";
import { jsonRequest, readJson, routeContext } from "@operator/test-utils/http";

jest.mock("@operator/lib/auth/operator", () => ({ getOperatorAccessStatus: jest.fn() }));
jest.mock("@operator/features/merchant-management/api/deletion-server", () => {
  class MerchantNotFoundError extends Error {}
  class MerchantAlreadyDeletedError extends Error {}
  class MerchantDeletionNotConfirmedError extends Error {}
  class MerchantHasOpenExchangesError extends Error {
    constructor(public readonly openExchanges: unknown[]) {
      super("対応中の交換が残っています");
    }
  }
  class MerchantDeletionCancellationError extends Error {
    constructor(
      public readonly cancelled: unknown[],
      public readonly failedExchangeIds: string[],
    ) {
      super("キャンセルに失敗");
    }
  }
  return {
    deleteMerchantForOperator: jest.fn(),
    getMerchantDeletionPreview: jest.fn(),
    MerchantNotFoundError,
    MerchantAlreadyDeletedError,
    MerchantDeletionNotConfirmedError,
    MerchantHasOpenExchangesError,
    MerchantDeletionCancellationError,
  };
});

import {
  deleteMerchantForOperator,
  getMerchantDeletionPreview,
  MerchantDeletionNotConfirmedError,
  MerchantHasOpenExchangesError,
  MerchantNotFoundError,
} from "@operator/features/merchant-management/api/deletion-server";
import { getOperatorAccessStatus } from "@operator/lib/auth/operator";

import { DELETE, GET } from "../route";

// 運用者の GET / DELETE /api/merchants/[merchantId]/deletion。
// 対応中の交換をキャンセルしてポイントを返す操作を含むため、認可と確認入力を固定する。
const URL_ = "http://operator.test/api/merchants/merchant-1/deletion";
const params = routeContext({ merchantId: "merchant-1" });
const operatorUser = { userId: "operator-1", roles: ["OPERATOR"], status: "ACTIVE" } as DBUserItem;

const mockedAccess = jest.mocked(getOperatorAccessStatus);
const mockedDelete = jest.mocked(deleteMerchantForOperator);
const mockedPreview = jest.mocked(getMerchantDeletionPreview);

function del(body: unknown) {
  return DELETE(jsonRequest(URL_, { method: "DELETE", body }), params);
}

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedAccess.mockResolvedValue({ allowed: true, session: {} as unknown as OperatorSession, user: operatorUser });
  mockedDelete.mockResolvedValue({ merchantId: "merchant-1", merchantName: "テスト", cancelledExchanges: [] });
});

test("未ログインなら 401、運用者ロール無しなら 403。いずれも削除しない", async () => {
  mockedAccess.mockResolvedValue({ allowed: false, reason: "unauthenticated" });
  expect((await del({ confirmName: "テスト" })).status).toBe(401);
  expect((await GET(jsonRequest(URL_), params)).status).toBe(401);

  mockedAccess.mockResolvedValue({ allowed: false, reason: "forbidden" });
  expect((await del({ confirmName: "テスト" })).status).toBe(403);

  expect(mockedDelete).not.toHaveBeenCalled();
  expect(mockedPreview).not.toHaveBeenCalled();
});

test("確認の入力がなければ 400 で、削除しない", async () => {
  expect((await del({ force: true })).status).toBe(400);
  expect(mockedDelete).not.toHaveBeenCalled();
});

test("対象はパスから決め、force・通知は true のときだけ有効にする", async () => {
  const response = await del({ merchantId: "other", confirmName: "テスト", force: "true", notifyApplicants: 1 });
  expect(response.status).toBe(200);
  expect(mockedDelete).toHaveBeenCalledWith(
    { merchantId: "merchant-1", confirmName: "テスト", force: false, notifyApplicants: false },
    operatorUser,
  );
});

test("エラー種別を HTTP ステータスに対応させる", async () => {
  mockedDelete.mockRejectedValueOnce(new MerchantDeletionNotConfirmedError());
  expect((await del({ confirmName: "x" })).status).toBe(400);

  mockedDelete.mockRejectedValueOnce(new MerchantNotFoundError());
  expect((await del({ confirmName: "x" })).status).toBe(404);

  const open = [{ exchangeId: "e1" }];
  mockedDelete.mockRejectedValueOnce(new MerchantHasOpenExchangesError(open as never));
  const conflict = await del({ confirmName: "x" });
  expect(conflict.status).toBe(409);
  await expect(readJson(conflict)).resolves.toMatchObject({ code: "open_exchanges", openExchanges: open });
});
