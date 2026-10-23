import { extractUserClaims } from "../session-store";

// Cognito の ID トークンからセッションに写す claim の取り出し。
// sub が無いトークンでセッションを作ってしまうと、どのユーザーとも紐付かないセッションが生まれる。
describe("extractUserClaims", () => {
  test("sub・email・name・cognito:username を写し取る", () => {
    expect(
      extractUserClaims({
        sub: "cognito-sub-1",
        email: "user@example.com",
        name: "山田 太郎",
        "cognito:username": "yamada",
        token_use: "id",
      }),
    ).toEqual({
      cognitoSub: "cognito-sub-1",
      email: "user@example.com",
      name: "山田 太郎",
      cognitoUsername: "yamada",
    });
  });

  test("sub の前後の空白は除去する", () => {
    expect(extractUserClaims({ sub: "  cognito-sub-1  " })?.cognitoSub).toBe("cognito-sub-1");
  });

  test("sub が無い・空・文字列以外なら null", () => {
    expect(extractUserClaims({})).toBeNull();
    expect(extractUserClaims({ sub: "" })).toBeNull();
    expect(extractUserClaims({ sub: "   " })).toBeNull();
    expect(extractUserClaims({ sub: 123 as unknown as string })).toBeNull();
  });

  test("文字列でない任意 claim は undefined になる", () => {
    expect(
      extractUserClaims({
        sub: "cognito-sub-1",
        email: 42 as unknown as string,
        name: null as unknown as string,
        "cognito:username": ["a"] as unknown as string,
      }),
    ).toEqual({
      cognitoSub: "cognito-sub-1",
      email: undefined,
      name: undefined,
      cognitoUsername: undefined,
    });
  });
});
