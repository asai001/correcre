import type { DBUserItem } from "@correcre/types";

import type { EmployeeSession } from "@employee/lib/auth/verify-token";
import { jsonRequest, readJson } from "@employee/test-utils/http";

// 認可ゲートの下層（セッション解決・ユーザー解決）を差し替え、認可ヘルパー本体は本物を通す。
jest.mock("@employee/lib/auth/session", () => ({ getEmployeeSession: jest.fn() }));
jest.mock("@employee/lib/auth/current-user", () => ({ getEmployeeUserForSession: jest.fn() }));
// データ層は機能モジュール単位で差し替える。
jest.mock("@employee/features/dashboard-summary/api/server", () => ({ getDashboardSummaryFromDynamo: jest.fn() }));
jest.mock("@employee/features/exchange-history/api/server", () => ({ getExchangeHistoryFromDynamo: jest.fn() }));
jest.mock("@employee/features/login-info/api/server", () => ({ getLoginInfoFromDynamo: jest.fn() }));
jest.mock("@employee/features/mission-report/api/server", () => ({ getMissionFromDynamo: jest.fn() }));
jest.mock("@employee/features/monthly-points-history/api/server", () => ({ getMonthlyPointsHistoryFromDynamo: jest.fn() }));
jest.mock("@employee/features/philosophy/api/server", () => ({ getPhilosophyFromDynamo: jest.fn() }));
jest.mock("@correcre/individual-analysis/server", () => ({
  getIndividualAnalysisSummaryFromDynamo: jest.fn(),
  getRecentReportsFromDynamo: jest.fn(),
}));

import { getDashboardSummaryFromDynamo } from "@employee/features/dashboard-summary/api/server";
import { getExchangeHistoryFromDynamo } from "@employee/features/exchange-history/api/server";
import { getLoginInfoFromDynamo } from "@employee/features/login-info/api/server";
import { getMissionFromDynamo } from "@employee/features/mission-report/api/server";
import { getMonthlyPointsHistoryFromDynamo } from "@employee/features/monthly-points-history/api/server";
import { getPhilosophyFromDynamo } from "@employee/features/philosophy/api/server";
import { getEmployeeUserForSession } from "@employee/lib/auth/current-user";
import { getEmployeeSession } from "@employee/lib/auth/session";
import { getIndividualAnalysisSummaryFromDynamo, getRecentReportsFromDynamo } from "@correcre/individual-analysis/server";

import { GET as getDashboardSummary } from "../dashboard-summary/route";
import { GET as getExchangeHistory } from "../exchange-history/route";
import { GET as getIndividualAnalysis } from "../individual-analysis/route";
import { GET as getLoginInfo } from "../login-info/route";
import { GET as getMission } from "../mission/route";
import { GET as getMissionFormConfig } from "../mission-form-config/route";
import { GET as getMonthlyPointsHistory } from "../monthly-points-history/route";
import { GET as getPhilosophy } from "../philosophy/route";
import { GET as getRecentReports } from "../recent-reports/route";

// 従業員アプリの読み取り系 API。もともと認証が無く、クエリの companyId / userId をそのまま信用していた。
// 「ログイン必須」「対象は本人（所属企業・自分自身）に固定」「別企業・別ユーザーの指定は 403」を全ルート共通で固定する。
const session = { sessionId: "session-1", role: "EMPLOYEE", cognitoSub: "sub-1" } as unknown as EmployeeSession;
const employee = {
  companyId: "company-1",
  userId: "employee-1",
  roles: ["EMPLOYEE"],
  status: "ACTIVE",
} as DBUserItem;

type RouteCase = {
  name: string;
  handler: (req: Request) => Promise<Response>;
  dataFn: jest.Mock;
  // 必須パラメータを揃えた（companyId / userId を含まない）正常系クエリ
  validQuery: Record<string, string>;
  // 正常系でデータ層へ渡る引数。companyId / userId はセッション由来でなければならない
  expectedArgs: unknown[];
  // userId を受け取らない（企業単位の）ルートは、別ユーザー指定の 403 検証を行わない
  companyScopedOnly?: boolean;
  // 必須パラメータ欠落で 400 になるクエリ（無いルートは undefined）
  missingQuery?: Record<string, string>;
};

const cases: RouteCase[] = [
  {
    name: "dashboard-summary",
    handler: getDashboardSummary,
    dataFn: jest.mocked(getDashboardSummaryFromDynamo),
    validQuery: { targetYearMonth: "2026-09" },
    expectedArgs: ["company-1", "employee-1", "2026-09"],
    missingQuery: {},
  },
  {
    name: "exchange-history",
    handler: getExchangeHistory,
    dataFn: jest.mocked(getExchangeHistoryFromDynamo),
    validQuery: { limit: "10", startDate: "2026-09-01" },
    expectedArgs: ["company-1", "employee-1", "2026-09-01", undefined, 10],
  },
  {
    name: "individual-analysis",
    handler: getIndividualAnalysis,
    dataFn: jest.mocked(getIndividualAnalysisSummaryFromDynamo),
    validQuery: { startDate: "2026-09-01", endDate: "2026-09-30" },
    expectedArgs: ["company-1", "employee-1", "2026-09-01", "2026-09-30"],
    missingQuery: { startDate: "2026-09-01" },
  },
  {
    name: "login-info",
    handler: getLoginInfo,
    dataFn: jest.mocked(getLoginInfoFromDynamo),
    validQuery: {},
    expectedArgs: ["company-1", "employee-1"],
  },
  {
    name: "mission",
    handler: getMission,
    dataFn: jest.mocked(getMissionFromDynamo),
    validQuery: {},
    expectedArgs: ["company-1", "employee-1"],
  },
  {
    name: "mission-form-config",
    handler: getMissionFormConfig,
    dataFn: jest.mocked(getMissionFromDynamo),
    validQuery: { missionId: "mission-1" },
    expectedArgs: ["company-1", "__form__"],
    companyScopedOnly: true,
    missingQuery: {},
  },
  {
    name: "monthly-points-history",
    handler: getMonthlyPointsHistory,
    dataFn: jest.mocked(getMonthlyPointsHistoryFromDynamo),
    validQuery: { months: "12" },
    expectedArgs: ["company-1", "employee-1", 12],
  },
  {
    name: "philosophy",
    handler: getPhilosophy,
    dataFn: jest.mocked(getPhilosophyFromDynamo),
    validQuery: {},
    expectedArgs: ["company-1"],
    companyScopedOnly: true,
  },
  {
    name: "recent-reports",
    handler: getRecentReports,
    dataFn: jest.mocked(getRecentReportsFromDynamo),
    validQuery: { limit: "5" },
    expectedArgs: ["company-1", 5, "employee-1", undefined, undefined],
  },
];

const mockedGetSession = jest.mocked(getEmployeeSession);
const mockedGetUser = jest.mocked(getEmployeeUserForSession);

function request(name: string, query: Record<string, string>) {
  const params = new URLSearchParams(query);
  return jsonRequest(`http://employee.test/api/${name}?${params.toString()}`);
}

function allowAsEmployee() {
  mockedGetSession.mockResolvedValue(session);
  mockedGetUser.mockResolvedValue(employee);
}

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

beforeEach(() => {
  jest.clearAllMocks();
  for (const c of cases) {
    c.dataFn.mockResolvedValue([] as never);
  }
  // mission-form-config は mission 一覧から対象を選ぶため、対象を含む結果を返す
  jest.mocked(getMissionFromDynamo).mockResolvedValue({
    mission: [{ companyId: "company-1", missionId: "mission-1", version: 1, title: "t", fields: [] }],
    missionReports: [],
  } as never);
});

describe.each(cases)(
  "GET /api/$name",
  ({ name, handler, dataFn, validQuery, expectedArgs, companyScopedOnly, missingQuery }) => {
    const ownScope: Record<string, string> = companyScopedOnly
      ? { companyId: "company-1" }
      : { companyId: "company-1", userId: "employee-1" };

    test("未ログインなら 401 unauthorized。データ層は呼ばない", async () => {
      mockedGetSession.mockResolvedValue(null);

      const response = await handler(request(name, { ...ownScope, ...validQuery }));

      expect(response.status).toBe(401);
      await expect(readJson(response)).resolves.toEqual({ error: "unauthorized" });
      expect(dataFn).not.toHaveBeenCalled();
    });

    test("セッションがあっても従業員ユーザーに解決できなければ 403 employee_only", async () => {
      mockedGetSession.mockResolvedValue(session);
      mockedGetUser.mockResolvedValue(null);

      const response = await handler(request(name, { ...ownScope, ...validQuery }));

      expect(response.status).toBe(403);
      await expect(readJson(response)).resolves.toEqual({ error: "employee_only" });
      expect(dataFn).not.toHaveBeenCalled();
    });

    test("別企業の companyId を指定すると 403 forbidden。データ層は呼ばない", async () => {
      allowAsEmployee();

      const response = await handler(request(name, { ...ownScope, companyId: "other-company", ...validQuery }));

      expect(response.status).toBe(403);
      await expect(readJson(response)).resolves.toEqual({ error: "forbidden" });
      expect(dataFn).not.toHaveBeenCalled();
    });

    if (!companyScopedOnly) {
      test("同じ企業でも別ユーザーの userId を指定すると 403 forbidden", async () => {
        allowAsEmployee();

        const response = await handler(request(name, { companyId: "company-1", userId: "colleague-2", ...validQuery }));

        expect(response.status).toBe(403);
        await expect(readJson(response)).resolves.toEqual({ error: "forbidden" });
        expect(dataFn).not.toHaveBeenCalled();
      });
    }

    test("自分自身を指定した場合は従来どおり応答し、対象はセッション由来になる", async () => {
      allowAsEmployee();

      const response = await handler(request(name, { ...ownScope, ...validQuery }));

      expect(response.status).toBe(200);
      expect(dataFn).toHaveBeenCalledTimes(1);
      expect(dataFn).toHaveBeenCalledWith(...expectedArgs);
    });

    test("companyId / userId を省略しても、セッションの本人で応答する", async () => {
      allowAsEmployee();

      const response = await handler(request(name, validQuery));

      expect(response.status).toBe(200);
      expect(dataFn).toHaveBeenCalledWith(...expectedArgs);
    });

    if (missingQuery) {
      test("必須パラメータが欠けていれば 400", async () => {
        allowAsEmployee();

        const response = await handler(request(name, missingQuery));

        expect(response.status).toBe(400);
        expect(dataFn).not.toHaveBeenCalled();
      });
    }

    test("データ層の失敗は内部情報を出さず 500 internal_error", async () => {
      allowAsEmployee();
      dataFn.mockRejectedValue(new Error("DynamoDB の内部的な失敗"));

      const response = await handler(request(name, validQuery));

      expect(response.status).toBe(500);
      await expect(readJson(response)).resolves.toEqual({ error: "internal_error" });
    });
  },
);
