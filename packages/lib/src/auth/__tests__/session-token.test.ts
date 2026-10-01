import { SignJWT } from "jose/jwt/sign";

import { signSessionToken, verifySessionToken, type SessionTokenPayload } from "../session-token";

// セッション Cookie の中身は HS256 の JWT。署名検証と claim の形チェックが崩れると
// 偽造 Cookie でログイン状態を作れてしまうため、改ざん・別鍵・不正 claim の拒否を固定する。
const SECRET = "test-session-secret-at-least-32-chars-long";
const LOGIN_AT = Date.parse("2026-10-01T00:00:00.000Z");

const payload: SessionTokenPayload = {
  sid: "session-1",
  sub: "cognito-sub-1",
  role: "ADMIN",
  email: "admin@example.com",
  name: "管理者",
  cognitoUsername: "admin",
  loginAt: LOGIN_AT,
  lastActiveAt: LOGIN_AT,
  rememberMe: false,
  idleMs: 30 * 60 * 1000,
  absoluteMs: 12 * 60 * 60 * 1000,
};

const farFuture = new Date(Date.now() + 60 * 60 * 1000);

beforeAll(() => {
  process.env.SESSION_SECRET = SECRET;
});

describe("signSessionToken / verifySessionToken", () => {
  test("署名したトークンは同じ payload に復元される", async () => {
    const token = await signSessionToken(payload, farFuture);

    await expect(verifySessionToken(token)).resolves.toEqual(payload);
  });

  test("任意項目（email / name / cognitoUsername）が無くても検証できる", async () => {
    const minimal: SessionTokenPayload = {
      sid: "s",
      sub: "u",
      role: "EMPLOYEE",
      loginAt: LOGIN_AT,
      lastActiveAt: LOGIN_AT,
      rememberMe: true,
      idleMs: 1,
      absoluteMs: null,
    };
    const token = await signSessionToken(minimal, farFuture);

    await expect(verifySessionToken(token)).resolves.toEqual({
      ...minimal,
      email: undefined,
      name: undefined,
      cognitoUsername: undefined,
    });
  });

  test("有効期限を過ぎたトークンは null", async () => {
    const token = await signSessionToken(payload, new Date(Date.now() - 1000));

    await expect(verifySessionToken(token)).resolves.toBeNull();
  });

  test("payload を書き換えたトークンは署名不一致で null", async () => {
    const token = await signSessionToken(payload, farFuture);
    const [header, body, signature] = token.split(".");
    const tampered = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    tampered.role = "OPERATOR";
    const tamperedToken = [header, Buffer.from(JSON.stringify(tampered)).toString("base64url"), signature].join(".");

    await expect(verifySessionToken(tamperedToken)).resolves.toBeNull();
  });

  test("別の鍵で署名されたトークンは null", async () => {
    const forged = await new SignJWT({ ...payload })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(Math.floor(farFuture.getTime() / 1000))
      .sign(new TextEncoder().encode("another-secret-that-is-also-32-chars-long"));

    await expect(verifySessionToken(forged)).resolves.toBeNull();
  });

  test("正しい鍵でも role が既知のロール以外なら null", async () => {
    const forged = await new SignJWT({ ...payload, role: "SUPERUSER" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(Math.floor(farFuture.getTime() / 1000))
      .sign(new TextEncoder().encode(SECRET));

    await expect(verifySessionToken(forged)).resolves.toBeNull();
  });

  test("正しい鍵でも必須 claim が欠けていれば null", async () => {
    const { sid: _sid, ...withoutSid } = payload;
    const forged = await new SignJWT({ ...withoutSid })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(Math.floor(farFuture.getTime() / 1000))
      .sign(new TextEncoder().encode(SECRET));

    await expect(verifySessionToken(forged)).resolves.toBeNull();
  });

  test("alg=none のトークンは null", async () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(farFuture.getTime() / 1000) })).toString(
      "base64url",
    );

    await expect(verifySessionToken(`${header}.${body}.`)).resolves.toBeNull();
  });

  test("壊れた文字列は null", async () => {
    await expect(verifySessionToken("not-a-jwt")).resolves.toBeNull();
    await expect(verifySessionToken("")).resolves.toBeNull();
  });
});

describe("SESSION_SECRET の検証", () => {
  // 署名鍵はモジュール内でキャッシュされるため、環境変数の違いは隔離したモジュールで検証する。
  // 鍵は署名時に遅延して読まれるので、環境変数は署名が終わるまで差し替えたままにする。
  async function signWithSecret(secret: string | undefined) {
    const previous = process.env.SESSION_SECRET;
    if (secret === undefined) {
      delete process.env.SESSION_SECRET;
    } else {
      process.env.SESSION_SECRET = secret;
    }

    try {
      let mod: typeof import("../session-token") | undefined;
      jest.isolateModules(() => {
        mod = jest.requireActual("../session-token");
      });

      return await mod!.signSessionToken(payload, farFuture);
    } finally {
      process.env.SESSION_SECRET = previous;
    }
  }

  test("未設定なら署名できない", async () => {
    await expect(signWithSecret(undefined)).rejects.toThrow("SESSION_SECRET is not set.");
  });

  test("32 文字未満なら署名できない", async () => {
    await expect(signWithSecret("too-short")).rejects.toThrow("at least 32 characters");
  });
});
