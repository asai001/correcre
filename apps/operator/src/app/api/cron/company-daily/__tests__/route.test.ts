jest.mock("@operator/features/company-daily-batch/api/server", () => ({ runCompanyDailyBatch: jest.fn() }));

import { runCompanyDailyBatch } from "@operator/features/company-daily-batch/api/server";

import { GET } from "../route";

// Vercel Cron から呼ばれる GET /api/cron/company-daily。導入企業の人数の再集計と未付与ポイントの会社還元。
const URL_ = "http://operator.test/api/cron/company-daily";
const mockedRun = jest.mocked(runCompanyDailyBatch);
const originalSecret = process.env.CRON_SECRET;

function get(authorization?: string) {
  return GET(new Request(URL_, { headers: authorization ? { authorization } : {} }));
}

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  jest.spyOn(console, "log").mockImplementation(() => undefined);
});

beforeEach(() => {
  jest.clearAllMocks();
  process.env.CRON_SECRET = "secret";
  mockedRun.mockResolvedValue({ companies: 2, employeeCountsSynced: 1, pointReturns: [], failures: [] });
});

afterAll(() => {
  process.env.CRON_SECRET = originalSecret;
});

test("CRON_SECRET が未設定なら 503、ヘッダーが違えば 401。どちらもバッチを動かさない", async () => {
  delete process.env.CRON_SECRET;
  expect((await get("Bearer secret")).status).toBe(503);

  process.env.CRON_SECRET = "secret";
  expect((await get("Bearer wrong")).status).toBe(401);
  expect((await get()).status).toBe(401);

  expect(mockedRun).not.toHaveBeenCalled();
});

test("正しいヘッダーならバッチを実行し、結果を返す", async () => {
  const res = await get("Bearer secret");

  expect(res.status).toBe(200);
  expect(mockedRun).toHaveBeenCalledTimes(1);
  expect(await res.json()).toMatchObject({ companies: 2, employeeCountsSynced: 1 });
});

test("一部の会社で失敗したら 500 で知らせる", async () => {
  mockedRun.mockResolvedValue({
    companies: 2,
    employeeCountsSynced: 0,
    pointReturns: [],
    failures: [{ companyId: "company-1", error: "boom" }],
  });

  expect((await get("Bearer secret")).status).toBe(500);
});
