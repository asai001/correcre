import { NextResponse } from "next/server";

import type { Company, DBUserItem } from "@correcre/types";

import { jsonRequest, readJson } from "@admin/test-utils/http";

jest.mock("@admin/app/api/employee-management/authorize", () => ({
  authorizeEmployeeManagementRequest: jest.fn(),
}));
jest.mock("@correcre/lib/company-management-server", () => ({
  updateCompanyInDynamo: jest.fn(),
}));
jest.mock("@correcre/lib/dynamodb/company", () => ({
  getCompanyById: jest.fn(),
  putCompany: jest.fn(),
}));
jest.mock("@correcre/lib/env/server", () => ({
  readRequiredServerEnv: jest.fn((name: string) => `test-${name}`),
}));

import { authorizeEmployeeManagementRequest } from "@admin/app/api/employee-management/authorize";
import { updateCompanyInDynamo } from "@correcre/lib/company-management-server";
import { getCompanyById, putCompany } from "@correcre/lib/dynamodb/company";

import { PATCH } from "../route";

// 管理者の PATCH /api/company-info。
// 会社名・ステータス・プラン・月額単価・ポイント単位・保有ポイントは請求額と契約に関わるため
// 運用者だけが変更できる。管理者 API を直接叩いて自社の請求額を書き換えられた過去の穴の回帰テスト。
const URL_ = "http://admin.test/api/company-info";
const NOW = "2026-10-01T00:00:00.000Z";

const adminUser: DBUserItem = {
  companyId: "company-1",
  sk: "USER#admin-1",
  userId: "admin-1",
  lastName: "管理",
  firstName: "者",
  email: "admin@example.com",
  roles: ["ADMIN"],
  status: "ACTIVE",
  currentPointBalance: 0,
  currentMonthCompletionRate: 0,
  createdAt: NOW,
  updatedAt: NOW,
  gsi2pk: "EMAIL#admin@example.com",
};

const storedCompany = {
  companyId: "company-1",
  name: "テスト社",
  status: "ACTIVE",
  plan: "STANDARD",
  perEmployeeMonthlyFee: 1000,
  companyPointBalance: 5000,
  activeEmployees: 3,
  contactEmail: "old@example.com",
  contactName: "旧担当",
  createdAt: NOW,
  updatedAt: NOW,
} as Company;

const mockedAuthorize = jest.mocked(authorizeEmployeeManagementRequest);
const mockedUpdateCompany = jest.mocked(updateCompanyInDynamo);
const mockedGetCompany = jest.mocked(getCompanyById);
const mockedPutCompany = jest.mocked(putCompany);

function allowAsAdmin() {
  mockedAuthorize.mockResolvedValue({ unauthorized: null, currentAdminUser: adminUser });
}

function patch(body: unknown) {
  return PATCH(jsonRequest(URL_, { method: "PATCH", body }));
}

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetCompany.mockResolvedValue(storedCompany);
});

describe("認可", () => {
  test("未ログインなら 401 を返し、何も更新しない", async () => {
    mockedAuthorize.mockResolvedValue({
      unauthorized: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
      currentAdminUser: null,
    });

    const response = await patch({ philosophyItems: [] });

    expect(response.status).toBe(401);
    expect(mockedUpdateCompany).not.toHaveBeenCalled();
    expect(mockedPutCompany).not.toHaveBeenCalled();
  });

  test("管理者ロールが無ければ 403 を返し、何も更新しない", async () => {
    mockedAuthorize.mockResolvedValue({
      unauthorized: NextResponse.json({ error: "admin_only" }, { status: 403 }),
      currentAdminUser: null,
    });

    const response = await patch({ philosophyItems: [] });

    expect(response.status).toBe(403);
    expect(mockedUpdateCompany).not.toHaveBeenCalled();
    expect(mockedPutCompany).not.toHaveBeenCalled();
  });
});

describe("契約・請求に関わる項目の保護", () => {
  test("リクエストに契約系フィールドが含まれていても、理念体系だけが更新される", async () => {
    allowAsAdmin();
    const philosophyItems = [{ id: "p1", label: "ミッション", content: "顧客第一" }];

    const response = await patch({
      name: "改名された社名",
      status: "INACTIVE",
      plan: "ENTERPRISE",
      perEmployeeMonthlyFee: 1,
      pointUnitLabel: "円",
      companyPointBalance: 9_999_999,
      philosophyItems,
    });

    expect(response.status).toBe(200);
    expect(mockedUpdateCompany).toHaveBeenCalledTimes(1);
    // 第 2 引数は「companyId と philosophyItems だけ」でなければならない（余計なキーが混ざれば失敗する）
    expect(mockedUpdateCompany).toHaveBeenCalledWith("company-1", { companyId: "company-1", philosophyItems });
    expect(mockedPutCompany).not.toHaveBeenCalled();
  });

  test("契約系フィールドだけのリクエストは何も更新せずに成功扱いにする", async () => {
    allowAsAdmin();

    const response = await patch({ perEmployeeMonthlyFee: 1, plan: "ENTERPRISE" });

    expect(response.status).toBe(200);
    expect(mockedUpdateCompany).not.toHaveBeenCalled();
    expect(mockedGetCompany).not.toHaveBeenCalled();
    expect(mockedPutCompany).not.toHaveBeenCalled();
  });

  test("詳細情報の更新でも、月額単価など保存済みの契約値はそのまま引き継がれる", async () => {
    allowAsAdmin();

    const response = await patch({ contactEmail: "new@example.com", perEmployeeMonthlyFee: 1 });

    expect(response.status).toBe(200);
    expect(mockedPutCompany).toHaveBeenCalledTimes(1);
    const [, saved] = mockedPutCompany.mock.calls[0];
    expect(saved.perEmployeeMonthlyFee).toBe(1000);
    expect(saved.plan).toBe("STANDARD");
    expect(saved.companyPointBalance).toBe(5000);
    expect(saved.contactEmail).toBe("new@example.com");
  });
});

describe("テナント境界", () => {
  test("対象企業はセッションの管理者が所属する企業であり、ボディの companyId は無視される", async () => {
    allowAsAdmin();

    await patch({ companyId: "other-company", contactEmail: "new@example.com" });

    expect(mockedGetCompany).toHaveBeenCalledWith(expect.anything(), "company-1");
    const [, saved] = mockedPutCompany.mock.calls[0];
    expect(saved.companyId).toBe("company-1");
  });
});

describe("詳細情報の部分更新", () => {
  test("ボディに含まれるキーだけを更新し、含まれないキーは既存値を維持する", async () => {
    allowAsAdmin();

    await patch({ contactEmail: "  new@example.com  " });

    const [, saved] = mockedPutCompany.mock.calls[0];
    expect(saved.contactEmail).toBe("new@example.com");
    expect(saved.contactName).toBe("旧担当");
    expect(saved.updatedAt).not.toBe(NOW);
  });

  test("空文字を送った項目は削除（undefined）になる", async () => {
    allowAsAdmin();

    await patch({ contactName: "   " });

    const [, saved] = mockedPutCompany.mock.calls[0];
    expect(saved.contactName).toBeUndefined();
  });

  test("ポイント換算レートが 0 以下なら 400 で保存しない", async () => {
    allowAsAdmin();

    const response = await patch({ pointConversionRate: 0 });

    expect(response.status).toBe(400);
    expect(mockedPutCompany).not.toHaveBeenCalled();
  });

  test("企業が見つからなければ 404", async () => {
    allowAsAdmin();
    mockedGetCompany.mockResolvedValue(null);

    const response = await patch({ contactEmail: "new@example.com" });

    expect(response.status).toBe(404);
    expect(mockedPutCompany).not.toHaveBeenCalled();
  });
});

describe("入力検証", () => {
  test("壊れた JSON は 400 invalid_json", async () => {
    allowAsAdmin();

    // この Route Handler は `err instanceof SyntaxError` で JSON の破損を判定する。
    // Jest では Request.json() が投げる SyntaxError が別レルム（Node 本体）のものになり instanceof が
    // 成立しないため、テスト側のレルムの SyntaxError を投げる json() に差し替えて本番相当の経路を通す。
    const request = jsonRequest(URL_, { method: "PATCH", rawBody: "{" });
    Object.defineProperty(request, "json", {
      value: () => Promise.reject(new SyntaxError("Unexpected end of JSON input")),
    });

    const response = await PATCH(request);

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toEqual({ error: "invalid_json" });
    expect(mockedUpdateCompany).not.toHaveBeenCalled();
    expect(mockedPutCompany).not.toHaveBeenCalled();
  });
});
