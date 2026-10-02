import { ADMIN_DEFAULT_REDIRECT_PATH } from "../constants";
import { pickFirstQueryValue, sanitizeRedirectTo } from "../redirect";

// ログイン後の戻り先（?from=）はユーザーが自由に書ける値。外部サイトへ飛ばせると
// 本物のログイン画面を踏ませてから偽サイトへ誘導するフィッシングに使われる。
describe("sanitizeRedirectTo", () => {
  test("未指定・空なら既定のリダイレクト先", () => {
    expect(sanitizeRedirectTo(undefined)).toBe(ADMIN_DEFAULT_REDIRECT_PATH);
    expect(sanitizeRedirectTo(null)).toBe(ADMIN_DEFAULT_REDIRECT_PATH);
    expect(sanitizeRedirectTo("")).toBe(ADMIN_DEFAULT_REDIRECT_PATH);
  });

  test("アプリ内の相対パスはクエリ付きでもそのまま通す", () => {
    expect(sanitizeRedirectTo("/employee-management")).toBe("/employee-management");
    expect(sanitizeRedirectTo("/analysis-report?month=2026-09&tab=all")).toBe("/analysis-report?month=2026-09&tab=all");
  });

  test("外部 URL やスキーム付きの値は既定のリダイレクト先に落とす", () => {
    expect(sanitizeRedirectTo("https://evil.example.com/login")).toBe(ADMIN_DEFAULT_REDIRECT_PATH);
    expect(sanitizeRedirectTo("javascript:alert(1)")).toBe(ADMIN_DEFAULT_REDIRECT_PATH);
    expect(sanitizeRedirectTo("evil.example.com")).toBe(ADMIN_DEFAULT_REDIRECT_PATH);
  });

  test("プロトコル相対 URL（//host）は外部へ飛ぶため拒否する", () => {
    expect(sanitizeRedirectTo("//evil.example.com/login")).toBe(ADMIN_DEFAULT_REDIRECT_PATH);
    expect(sanitizeRedirectTo("///evil.example.com")).toBe(ADMIN_DEFAULT_REDIRECT_PATH);
  });

  test("バックスラッシュ始まりはブラウザが // と解釈し得るため拒否する", () => {
    expect(sanitizeRedirectTo("\\\\evil.example.com")).toBe(ADMIN_DEFAULT_REDIRECT_PATH);
  });
});

describe("pickFirstQueryValue", () => {
  test("配列なら先頭、単一値ならそのまま、未指定なら undefined", () => {
    expect(pickFirstQueryValue(["/a", "/b"])).toBe("/a");
    expect(pickFirstQueryValue("/a")).toBe("/a");
    expect(pickFirstQueryValue(undefined)).toBeUndefined();
  });
});
