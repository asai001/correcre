import { COGNITO_PASSWORD_RULE_TEXT, isValidCognitoPassword } from "../password";

// Cognito のパスワードポリシー（infra 側: 8 文字以上・文字種要件なし）と、
// アプリ側の事前チェックがずれると「画面では通るのに Cognito で弾かれる」になる。
describe("isValidCognitoPassword", () => {
  test("半角英数字 8 文字以上は有効", () => {
    expect(isValidCognitoPassword("abcd1234")).toBe(true);
    expect(isValidCognitoPassword("ABCDEFGH")).toBe(true);
    expect(isValidCognitoPassword("12345678")).toBe(true);
    expect(isValidCognitoPassword("a".repeat(64))).toBe(true);
  });

  test("7 文字以下は無効", () => {
    expect(isValidCognitoPassword("abc1234")).toBe(false);
    expect(isValidCognitoPassword("")).toBe(false);
  });

  test("記号・空白・全角文字を含むと無効", () => {
    expect(isValidCognitoPassword("abcd123!")).toBe(false);
    expect(isValidCognitoPassword("abcd 1234")).toBe(false);
    expect(isValidCognitoPassword("ａｂｃｄ１２３４")).toBe(false);
    expect(isValidCognitoPassword("abcd1234\n")).toBe(false);
  });

  test("案内文言はルールと一致している", () => {
    expect(COGNITO_PASSWORD_RULE_TEXT).toBe("半角英数字8文字以上");
  });
});
