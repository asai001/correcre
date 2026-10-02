import type { DBUserItem } from "@correcre/types";

import type { AdminSession } from "@admin/lib/auth/verify-token";
import { jsonRequest, readJson } from "@admin/test-utils/http";

// 認可ゲートの下層（セッション解決・ユーザー解決）を差し替え、認可ヘルパー本体は本物を通す。
jest.mock("@admin/lib/auth/session", () => ({ getAdminSession: jest.fn() }));
jest.mock("@admin/lib/auth/current-user", () => ({ getAdminUserForSession: jest.fn() }));
// データ層は機能モジュール単位で差し替える。
jest.mock("@admin/features/avg-item-completion/api/server", () => ({ getAvgItemCompletionFromDynamo: jest.fn() }));
jest.mock("@admin/features/avg-points-trend/api/server", () => ({ getAvgPointsTrendFromDynamo: jest.fn() }));
jest.mock("@admin/features/dashboard-summary/api/server", () => ({ getDashboardSummaryFromDynamo: jest.fn() }));
jest.mock("@admin/features/login-info/api/server", () => ({ getLoginInfoFromDynamo: jest.fn() }));
jest.mock("@admin/features/overall-analysis/api/server", () => ({ getOverallAnalysisSummaryFromDynamo: jest.fn() }));
jest.mock("@correcre/individual-analysis/server", () => ({
  getIndividualAnalysisSummaryFromDynamo: jest.fn(),
  getRecentReportsFromDynamo: jest.fn(),
}));
jest.mock("@correcre/lib/dynamodb/exchange-history", () => ({ listExchangeHistoryByCompanyAndUser: jest.fn() }));
jest.mock("@correcre/lib/env/server", () => ({ readRequiredServerEnv: jest.fn((name: string) => `test-${name}`) }));

import { getAvgItemCompletionFromDynamo } from "@admin/features/avg-item-completion/api/server";
import { getAvgPointsTrendFromDynamo } from "@admin/features/avg-points-trend/api/server";
import { getDashboardSummaryFromDynamo } from "@admin/features/dashboard-summary/api/server";
import { getLoginInfoFromDynamo } from "@admin/features/login-info/api/server";
import { getOverallAnalysisSummaryFromDynamo } from "@admin/features/overall-analysis/api/server";
import { getAdminUserForSession } from "@admin/lib/auth/current-user";
import { getAdminSession } from "@admin/lib/auth/session";
import { getIndividualAnalysisSummaryFromDynamo, getRecentReportsFromDynamo } from "@correcre/individual-analysis/server";
import { listExchangeHistoryByCompanyAndUser } from "@correcre/lib/dynamodb/exchange-history";

import { GET as getAvgItemCompletion } from "../avg-item-completion/route";
import { GET as getAvgPointsTrend } from "../avg-points-trend/route";
import { GET as getDashboardSummary } from "../dashboard-summary/route";
import { GET as getExchangeHistory } from "../exchange-history/route";
import { GET as getIndividualAnalysis } from "../individual-analysis/route";
import { GET as getLoginInfo } from "../login-info/route";
import { GET as getOverallAnalysis } from "../overall-analysis/route";
import { GET as getRecentReports } from "../recent-reports/route";

// 管理者アプリの読み取り系 API。もともと認証が無く、クエリの companyId / userId をそのまま信用していた。
// 「ログイン必須」「対象企業はセッションの所属企業に固定」「別企業の指定は 403」を全ルート共通で固定する。
const session = { sessionId: "session-1", role: "ADMIN", cognitoSub: "sub-1" } as unknown as AdminSession;
const adminUser = {
  companyId: "company-1",
  userId: "admin-1",
  roles: ["ADMIN"],
  status: "ACTIVE",
} as DBUserItem;

type RouteCase = {
  name: string;
  handler: (req: Request) => Promise<Response>;
  dataFn: jest.Mock;
  // 必須パラメータを揃えた（companyId を含まない）正常系クエリ
  validQuery: Record<string, string>;
  // 正常系でデータ層へ渡る引数。companyId はセッション由来の "company-1" でなければならない
  expectedArgs: unknown[];
  // 必須パラメータ欠落で 400 になるクエリ（無いルートは undefined）
  missingQuery?: Record<string, string>;
};

const cases: RouteCase[] = [
  {
    name: "avg-item-completion",
    handler: getAvgItemCompletion,
    dataFn: jest.mocked(getAvgItemCompletionFromDynamo),
    validQuery: { thisYearMonth: "2026-09" },
    expectedArgs: ["company-1", "2026-09"],
    missingQuery: {},
  },
  {
    name: "avg-points-trend",
    handler: getAvgPointsTrend,
    dataFn: jest.mocked(getAvgPointsTrendFromDynamo),
    validQuery: { months: "6" },
    expectedArgs: ["company-1", 6],
  },
  {
    name: "dashboard-summary",
    handler: getDashboardSummary,
    dataFn: jest.mocked(getDashboardSummaryFromDynamo),
    validQuery: { userId: "employee-7", targetYearMonth: "2026-09" },
    expectedArgs: ["company-1", "employee-7", "2026-09"],
    missingQuery: { userId: "employee-7" },
  },
  {
    name: "exchange-history",
    handler: getExchangeHistory,
    dataFn: jest.mocked(listExchangeHistoryByCompanyAndUser),
    validQuery: { userId: "employee-7" },
    expectedArgs: [expect.anything(), "company-1", "employee-7"],
    missingQuery: {},
  },
  {
    name: "individual-analysis",
    handler: getIndividualAnalysis,
    dataFn: jest.mocked(getIndividualAnalysisSummaryFromDynamo),
    validQuery: { userId: "employee-7", startDate: "2026-09-01", endDate: "2026-09-30" },
    expectedArgs: ["company-1", "employee-7", "2026-09-01", "2026-09-30"],
    missingQuery: { userId: "employee-7" },
  },
  {
    name: "login-info",
    handler: getLoginInfo,
    dataFn: jest.mocked(getLoginInfoFromDynamo),
    validQuery: { userId: "employee-7" },
    expectedArgs: ["company-1", "employee-7"],
    missingQuery: {},
  },
  {
    name: "overall-analysis",
    handler: getOverallAnalysis,
    dataFn: jest.mocked(getOverallAnalysisSummaryFromDynamo),
    validQuery: { startDate: "2026-09-01", endDate: "2026-09-30", departmentId: "dept-1" },
    expectedArgs: ["company-1", "2026-09-01", "2026-09-30", "dept-1"],
    missingQuery: { startDate: "2026-09-01" },
  },
  {
    name: "recent-reports",
    handler: getRecentReports,
    dataFn: jest.mocked(getRecentReportsFromDynamo),
    validQuery: { limit: "5", userId: "employee-7" },
    expectedArgs: ["company-1", 5, "employee-7", undefined, undefined],
  },
];

const mockedGetSession = jest.mocked(getAdminSession);
const mockedGetUser = jest.mocked(getAdminUserForSession);

function request(name: string, query: Record<string, string>) {
  const params = new URLSearchParams(query);
  return jsonRequest(`http://admin.test/api/${name}?${params.toString()}`);
}

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

beforeEach(() => {
  jest.clearAllMocks();
  for (const c of cases) {
    c.dataFn.mockResolvedValue([] as never);
  }
});

describe.each(cases)("GET /api/$name", ({ name, handler, dataFn, validQuery, expectedArgs, missingQuery }) => {
  test("未ログインなら 401 unauthorized。データ層は呼ばない", async () => {
    mockedGetSession.mockResolvedValue(null);

    const response = await handler(request(name, { companyId: "company-1", ...validQuery }));

    expect(response.status).toBe(401);
    await expect(readJson(response)).resolves.toEqual({ error: "unauthorized" });
    expect(dataFn).not.toHaveBeenCalled();
  });

  test("セッションがあっても管理者ユーザーに解決できなければ 403 admin_only", async () => {
    mockedGetSession.mockResolvedValue(session);
    mockedGetUser.mockResolvedValue(null);

    const response = await handler(request(name, { companyId: "company-1", ...validQuery }));

    expect(response.status).toBe(403);
    await expect(readJson(response)).resolves.toEqual({ error: "admin_only" });
    expect(dataFn).not.toHaveBeenCalled();
  });

  test("別企業の companyId を指定すると 403 forbidden。データ層は呼ばない", async () => {
    mockedGetSession.mockResolvedValue(session);
    mockedGetUser.mockResolvedValue(adminUser);

    const response = await handler(request(name, { companyId: "other-company", ...validQuery }));

    expect(response.status).toBe(403);
    await expect(readJson(response)).resolves.toEqual({ error: "forbidden" });
    expect(dataFn).not.toHaveBeenCalled();
  });

  test("自社の companyId を指定した場合は従来どおり応答し、対象企業はセッション由来になる", async () => {
    mockedGetSession.mockResolvedValue(session);
    mockedGetUser.mockResolvedValue(adminUser);

    const response = await handler(request(name, { companyId: "company-1", ...validQuery }));

    expect(response.status).toBe(200);
    expect(dataFn).toHaveBeenCalledTimes(1);
    expect(dataFn).toHaveBeenCalledWith(...expectedArgs);
  });

  test("companyId を省略しても、セッションの所属企業で応答する", async () => {
    mockedGetSession.mockResolvedValue(session);
    mockedGetUser.mockResolvedValue(adminUser);

    const response = await handler(request(name, validQuery));

    expect(response.status).toBe(200);
    expect(dataFn).toHaveBeenCalledWith(...expectedArgs);
  });

  if (missingQuery) {
    test("必須パラメータが欠けていれば 400", async () => {
      mockedGetSession.mockResolvedValue(session);
      mockedGetUser.mockResolvedValue(adminUser);

      const response = await handler(request(name, missingQuery));

      expect(response.status).toBe(400);
      expect(dataFn).not.toHaveBeenCalled();
    });
  }

  test("データ層の失敗は内部情報を出さず 500 internal_error", async () => {
    mockedGetSession.mockResolvedValue(session);
    mockedGetUser.mockResolvedValue(adminUser);
    dataFn.mockRejectedValue(new Error("DynamoDB の内部的な失敗"));

    const response = await handler(request(name, validQuery));

    expect(response.status).toBe(500);
    await expect(readJson(response)).resolves.toEqual({ error: "internal_error" });
  });
});
