import type { DBUserItem } from "@correcre/types";

import type { OperatorSession } from "@operator/lib/auth/verify-token";
import { jsonRequest, readJson } from "@operator/test-utils/http";

jest.mock("@operator/lib/auth/operator", () => ({ getOperatorAccessStatus: jest.fn() }));
jest.mock("@operator/features/invoice-issuer-settings/api/server", () => ({
  updateInvoiceIssuerSettings: jest.fn(),
}));
jest.mock("@correcre/lib/dynamodb/system-setting", () => ({
  isSystemSettingTableMissingError: jest.fn(() => false),
}));

import { updateInvoiceIssuerSettings } from "@operator/features/invoice-issuer-settings/api/server";
import { getOperatorAccessStatus } from "@operator/lib/auth/operator";

import { PUT } from "../route";

// 運用者の PUT /api/settings/invoice-issuer。導入企業へ出す請求書の発行元情報を保存する。
const URL_ = "http://operator.test/api/settings/invoice-issuer";
const operatorUser = { userId: "operator-1", roles: ["OPERATOR"], status: "ACTIVE" } as DBUserItem;

const mockedAccess = jest.mocked(getOperatorAccessStatus);
const mockedUpdate = jest.mocked(updateInvoiceIssuerSettings);

function put(body: unknown) {
  return PUT(jsonRequest(URL_, { method: "PUT", body }));
}

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedAccess.mockResolvedValue({ allowed: true, session: {} as unknown as OperatorSession, user: operatorUser });
  mockedUpdate.mockResolvedValue({ issuer: { companyName: "em株式会社" }, updatedAt: "2026-10-16T00:00:00.000Z" });
});

test("未ログインなら 401、運用者ロール無しなら 403。いずれも保存しない", async () => {
  mockedAccess.mockResolvedValue({ allowed: false, reason: "unauthenticated" });
  expect((await put({ companyName: "em株式会社" })).status).toBe(401);

  mockedAccess.mockResolvedValue({ allowed: false, reason: "forbidden" });
  expect((await put({ companyName: "em株式会社" })).status).toBe(403);

  expect(mockedUpdate).not.toHaveBeenCalled();
});

test("入力が不正なら 400 で理由を返し、保存しない", async () => {
  const response = await put({ companyName: "em株式会社", registrationNumber: "123" });
  expect(response.status).toBe(400);
  await expect(readJson(response)).resolves.toMatchObject({ error: expect.stringContaining("登録番号") });
  expect(mockedUpdate).not.toHaveBeenCalled();
});

test("正規化した値と、操作した運用者を保存する", async () => {
  const response = await put({ companyName: " em株式会社 ", registrationNumber: "t1234567890123" });
  expect(response.status).toBe(200);
  expect(mockedUpdate).toHaveBeenCalledWith({
    issuer: expect.objectContaining({ companyName: "em株式会社", registrationNumber: "T1234567890123" }),
    updatedBy: "operator-1",
  });
});
