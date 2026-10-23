import { EMPLOYEE_CLEAR_SESSION_PATH, EMPLOYEE_DEFAULT_REDIRECT_PATH } from "../constants";
import { buildClearEmployeeSessionRedirect } from "../redirect";

// 使えなくなったセッション（ユーザーが削除済みなど）は Server Component では Cookie を消せないため、
// セッション破棄の Route Handler へリダイレクトして消してからログイン画面へ戻す。
describe("buildClearEmployeeSessionRedirect", () => {
  test("戻り先が既定なら from を付けずにセッション破棄 API へ", () => {
    expect(buildClearEmployeeSessionRedirect()).toBe(EMPLOYEE_CLEAR_SESSION_PATH);
    expect(buildClearEmployeeSessionRedirect(EMPLOYEE_DEFAULT_REDIRECT_PATH)).toBe(EMPLOYEE_CLEAR_SESSION_PATH);
  });

  test("アプリ内の戻り先は from に URL エンコードして引き継ぐ", () => {
    expect(buildClearEmployeeSessionRedirect("/exchange-history?status=REQUESTED")).toBe(
      `${EMPLOYEE_CLEAR_SESSION_PATH}?from=%2Fexchange-history%3Fstatus%3DREQUESTED`,
    );
  });

  test("外部 URL は from に乗らない", () => {
    expect(buildClearEmployeeSessionRedirect("https://evil.example.com")).toBe(EMPLOYEE_CLEAR_SESSION_PATH);
    expect(buildClearEmployeeSessionRedirect("//evil.example.com")).toBe(EMPLOYEE_CLEAR_SESSION_PATH);
  });
});
