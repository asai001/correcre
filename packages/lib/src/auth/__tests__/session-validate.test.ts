import { getCookieExpiryDate, getSessionLifetimePolicy } from "../session-policy";
import { verifySessionToken, type SessionTokenPayload } from "../session-token";
import { evaluateSessionToken, maybeTouchSessionToken } from "../session-validate";

// 各アプリの middleware と getXxxSession はこの関数でトークンの寿命を判定する。
const MINUTE_MS = 60 * 1000;
const LOGIN_AT = Date.parse("2026-10-01T00:00:00.000Z");

function buildPayload(
  role: SessionTokenPayload["role"],
  rememberMe: boolean,
  overrides: Partial<SessionTokenPayload> = {},
): SessionTokenPayload {
  const policy = getSessionLifetimePolicy(role, rememberMe);

  return {
    sid: "session-1",
    sub: "cognito-sub-1",
    role,
    email: "user@example.com",
    loginAt: LOGIN_AT,
    lastActiveAt: LOGIN_AT,
    rememberMe,
    idleMs: policy.idleMs,
    absoluteMs: policy.absoluteMs,
    ...overrides,
  };
}

describe("evaluateSessionToken", () => {
  test("有効なトークンは active になり、セッション情報へ写し取られる", () => {
    const payload = buildPayload("ADMIN", false);
    const now = new Date(LOGIN_AT + 5 * MINUTE_MS);

    const result = evaluateSessionToken(payload, { now });

    expect(result.status).toBe("active");
    if (result.status !== "active") return;
    expect(result.session).toMatchObject({
      sessionId: "session-1",
      role: "ADMIN",
      cognitoSub: "cognito-sub-1",
      email: "user@example.com",
      rememberMe: false,
      loginAt: new Date(LOGIN_AT),
      lastActiveAt: new Date(LOGIN_AT),
      policy: getSessionLifetimePolicy("ADMIN", false),
      cookieExpiresAt: getCookieExpiryDate({ loginAt: new Date(LOGIN_AT), policy: getSessionLifetimePolicy("ADMIN", false) }),
      payload,
    });
  });

  test("トークン内の idleMs がコードのポリシーと違えば、期限内でも policy-mismatch で失効", () => {
    // 署名鍵が漏れた場合や、ポリシーを短くするリリース後に古いトークンが残った場合の防御。
    const payload = buildPayload("ADMIN", false, { idleMs: 365 * 24 * 60 * MINUTE_MS });

    expect(evaluateSessionToken(payload, { now: new Date(LOGIN_AT + MINUTE_MS) })).toEqual({
      status: "expired",
      reason: "policy-mismatch",
    });
  });

  test("absoluteMs を null に書き換えた管理者トークンも policy-mismatch", () => {
    const payload = buildPayload("ADMIN", true, { absoluteMs: null });

    expect(evaluateSessionToken(payload, { now: new Date(LOGIN_AT + MINUTE_MS) })).toEqual({
      status: "expired",
      reason: "policy-mismatch",
    });
  });

  test("最終操作から idleMs を超えると idle で失効", () => {
    const payload = buildPayload("MERCHANT", false);

    expect(evaluateSessionToken(payload, { now: new Date(LOGIN_AT + payload.idleMs + 1) })).toEqual({
      status: "expired",
      reason: "idle",
    });
  });

  test("ログインから absoluteMs を超えると、直前に操作していても absolute で失効", () => {
    const payload = buildPayload("OPERATOR", false);
    const now = LOGIN_AT + payload.absoluteMs! + 1;

    expect(evaluateSessionToken({ ...payload, lastActiveAt: now - MINUTE_MS }, { now: new Date(now) })).toEqual({
      status: "expired",
      reason: "absolute",
    });
  });

  test("従業員のログイン保持トークンは absolute では失効しない", () => {
    const payload = buildPayload("EMPLOYEE", true);
    const now = LOGIN_AT + 400 * 24 * 60 * MINUTE_MS;

    expect(evaluateSessionToken({ ...payload, lastActiveAt: now - MINUTE_MS }, { now: new Date(now) }).status).toBe(
      "active",
    );
  });
});

describe("maybeTouchSessionToken", () => {
  // 再発行されたトークンの exp は Cookie 期限（ログイン時刻 + 絶対期限）になる。
  // 実時計で検証するため、ここだけはログイン時刻を「いま」にする。
  const loginAt = Date.now();

  beforeAll(() => {
    process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars-long";
  });

  test("最終操作から 60 秒未満なら再発行しない（null）", async () => {
    const payload = buildPayload("ADMIN", false, { loginAt, lastActiveAt: loginAt });

    await expect(maybeTouchSessionToken(payload, { now: new Date(loginAt + 59 * 1000) })).resolves.toBeNull();
  });

  test("60 秒以上経っていれば lastActiveAt を進めた新しいトークンを発行する", async () => {
    const payload = buildPayload("ADMIN", false, { loginAt, lastActiveAt: loginAt });
    const now = new Date(loginAt + 2 * MINUTE_MS);

    const touched = await maybeTouchSessionToken(payload, { now });

    expect(touched).not.toBeNull();
    expect(touched!.payload).toEqual({ ...payload, lastActiveAt: now.getTime() });
    // Cookie の期限はログイン時刻基準（操作で延びるのはアイドル期限だけ）
    expect(touched!.cookieExpiresAt).toEqual(
      getCookieExpiryDate({ loginAt: new Date(loginAt), policy: getSessionLifetimePolicy("ADMIN", false) }),
    );
    await expect(verifySessionToken(touched!.token)).resolves.toEqual(touched!.payload);
  });

  test("touchIntervalMs を指定すると、その間隔で再発行の要否を判定する", async () => {
    const payload = buildPayload("EMPLOYEE", true, { loginAt, lastActiveAt: loginAt });

    await expect(
      maybeTouchSessionToken(payload, { now: new Date(loginAt + 5 * MINUTE_MS), touchIntervalMs: 10 * MINUTE_MS }),
    ).resolves.toBeNull();
    await expect(
      maybeTouchSessionToken(payload, { now: new Date(loginAt + 10 * MINUTE_MS), touchIntervalMs: 10 * MINUTE_MS }),
    ).resolves.not.toBeNull();
  });
});
