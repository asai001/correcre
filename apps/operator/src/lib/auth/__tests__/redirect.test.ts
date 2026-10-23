import { OPERATOR_CLEAR_SESSION_PATH, OPERATOR_DEFAULT_REDIRECT_PATH } from "../constants";
import { buildClearOperatorSessionRedirect, sanitizeRedirectTo } from "../redirect";

// ログイン後の戻り先（?from=）はユーザーが自由に書ける値。外部サイトへ飛ばせると
// 本物のログイン画面を踏ませてから偽サイトへ誘導するフィッシングに使われる。
describe("sanitizeRedirectTo", () => {
  test("未指定・空なら既定のリダイレクト先", () => {
    expect(sanitizeRedirectTo(undefined)).toBe(OPERATOR_DEFAULT_REDIRECT_PATH);
    expect(sanitizeRedirectTo(null)).toBe(OPERATOR_DEFAULT_REDIRECT_PATH);
    expect(sanitizeRedirectTo("")).toBe(OPERATOR_DEFAULT_REDIRECT_PATH);
  });

  test("アプリ内の相対パスはクエリ付きでもそのまま通す", () => {
    expect(sanitizeRedirectTo("/missions")).toBe("/missions");
    expect(sanitizeRedirectTo("/exchanges?status=REQUESTED")).toBe("/exchanges?status=REQUESTED");
  });

  test("外部 URL・スキーム付き・プロトコル相対 URL は既定のリダイレクト先に落とす", () => {
    expect(sanitizeRedirectTo("https://evil.example.com/login")).toBe(OPERATOR_DEFAULT_REDIRECT_PATH);
    expect(sanitizeRedirectTo("javascript:alert(1)")).toBe(OPERATOR_DEFAULT_REDIRECT_PATH);
    expect(sanitizeRedirectTo("//evil.example.com/login")).toBe(OPERATOR_DEFAULT_REDIRECT_PATH);
    expect(sanitizeRedirectTo("\\\\evil.example.com")).toBe(OPERATOR_DEFAULT_REDIRECT_PATH);
  });
});

describe("buildClearOperatorSessionRedirect", () => {
  test("戻り先が既定なら from を付けずにセッション破棄 API へ", () => {
    expect(buildClearOperatorSessionRedirect()).toBe(OPERATOR_CLEAR_SESSION_PATH);
    expect(buildClearOperatorSessionRedirect(OPERATOR_DEFAULT_REDIRECT_PATH)).toBe(OPERATOR_CLEAR_SESSION_PATH);
  });

  test("アプリ内の戻り先は from に URL エンコードして引き継ぐ", () => {
    expect(buildClearOperatorSessionRedirect("/exchanges?status=REQUESTED")).toBe(
      `${OPERATOR_CLEAR_SESSION_PATH}?from=%2Fexchanges%3Fstatus%3DREQUESTED`,
    );
  });

  test("外部 URL は from に乗らない", () => {
    expect(buildClearOperatorSessionRedirect("https://evil.example.com")).toBe(OPERATOR_CLEAR_SESSION_PATH);
    expect(buildClearOperatorSessionRedirect("//evil.example.com")).toBe(OPERATOR_CLEAR_SESSION_PATH);
  });
});
