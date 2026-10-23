import { MERCHANT_CLEAR_SESSION_PATH, MERCHANT_DEFAULT_REDIRECT_PATH } from "../constants";
import { buildClearMerchantSessionRedirect } from "../redirect";

// 使えなくなったセッション（ユーザーが削除済みなど）は Server Component では Cookie を消せないため、
// セッション破棄の Route Handler へリダイレクトして消してからログイン画面へ戻す。
describe("buildClearMerchantSessionRedirect", () => {
  test("戻り先が既定なら from を付けずにセッション破棄 API へ", () => {
    expect(buildClearMerchantSessionRedirect()).toBe(MERCHANT_CLEAR_SESSION_PATH);
    expect(buildClearMerchantSessionRedirect(MERCHANT_DEFAULT_REDIRECT_PATH)).toBe(MERCHANT_CLEAR_SESSION_PATH);
  });

  test("アプリ内の戻り先は from に URL エンコードして引き継ぐ", () => {
    expect(buildClearMerchantSessionRedirect("/exchanges?status=UNFINISHED")).toBe(
      `${MERCHANT_CLEAR_SESSION_PATH}?from=%2Fexchanges%3Fstatus%3DUNFINISHED`,
    );
  });

  test("外部 URL は from に乗らない", () => {
    expect(buildClearMerchantSessionRedirect("https://evil.example.com")).toBe(MERCHANT_CLEAR_SESSION_PATH);
    expect(buildClearMerchantSessionRedirect("//evil.example.com")).toBe(MERCHANT_CLEAR_SESSION_PATH);
  });
});
