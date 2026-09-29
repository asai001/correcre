import { REQUIRED_ENV_BY_APP, assertRequiredEnvForDeploy, findMissingEnv } from "../required-env";

function fullEnv(app: keyof typeof REQUIRED_ENV_BY_APP): Record<string, string> {
  return Object.fromEntries(REQUIRED_ENV_BY_APP[app].map((name) => [name, "value"]));
}

describe("findMissingEnv", () => {
  it("未設定と空白だけの値を不足として返す", () => {
    expect(findMissingEnv(["A", "B", "C"], { A: "x", B: "  " })).toEqual(["B", "C"]);
  });
});

describe("assertRequiredEnvForDeploy", () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it("ローカル（VERCEL_ENV なし）では何もしない", () => {
    expect(() => assertRequiredEnvForDeploy("operator", {})).not.toThrow();
    expect(warn).not.toHaveBeenCalled();
  });

  it("本番で不足があるとビルドを止め、不足した変数名を示す", () => {
    const env = { ...fullEnv("operator"), VERCEL_ENV: "production", CRON_SECRET: "" };
    expect(() => assertRequiredEnvForDeploy("operator", env)).toThrow(/CRON_SECRET/);
  });

  it("本番ですべて揃っていれば通る", () => {
    for (const app of Object.keys(REQUIRED_ENV_BY_APP) as (keyof typeof REQUIRED_ENV_BY_APP)[]) {
      expect(() => assertRequiredEnvForDeploy(app, { ...fullEnv(app), VERCEL_ENV: "production" })).not.toThrow();
    }
  });

  it("プレビューでは不足を警告するだけでビルドは止めない", () => {
    const env = { ...fullEnv("merchant"), VERCEL_ENV: "preview", DDB_MERCHANT_CALENDAR_TABLE_NAME: undefined };
    expect(() => assertRequiredEnvForDeploy("merchant", env)).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("DDB_MERCHANT_CALENDAR_TABLE_NAME"));
  });

  it("一覧に同じ変数が重複していない", () => {
    for (const names of Object.values(REQUIRED_ENV_BY_APP)) {
      expect(new Set(names).size).toBe(names.length);
    }
  });
});
