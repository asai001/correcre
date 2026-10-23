import {
  SESSION_POLICIES,
  evaluateSessionExpiry,
  getCookieExpiryDate,
  getSessionLifetimePolicy,
} from "../session-policy";

// セッションの寿命は 4 アプリ共通のルール。ここが緩むと「放置した管理画面が開いたまま」になる。
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

describe("getSessionLifetimePolicy", () => {
  test("従業員は 48 時間アイドル。通常は 30 日、ログイン保持では無期限", () => {
    expect(getSessionLifetimePolicy("EMPLOYEE", false)).toEqual({ idleMs: 48 * HOUR_MS, absoluteMs: 30 * DAY_MS });
    expect(getSessionLifetimePolicy("EMPLOYEE", true)).toEqual({ idleMs: 48 * HOUR_MS, absoluteMs: null });
  });

  test.each(["ADMIN", "OPERATOR", "MERCHANT"] as const)(
    "%s は 30 分アイドル。通常は 12 時間、ログイン保持では 30 日",
    (role) => {
      expect(getSessionLifetimePolicy(role, false)).toEqual({ idleMs: 30 * MINUTE_MS, absoluteMs: 12 * HOUR_MS });
      expect(getSessionLifetimePolicy(role, true)).toEqual({ idleMs: 30 * MINUTE_MS, absoluteMs: 30 * DAY_MS });
    },
  );

  test("バックオフィス系のロールは従業員より短いアイドル期限を持つ", () => {
    for (const role of ["ADMIN", "OPERATOR", "MERCHANT"] as const) {
      expect(SESSION_POLICIES[role].default.idleMs).toBeLessThan(SESSION_POLICIES.EMPLOYEE.default.idleMs);
    }
  });
});

describe("evaluateSessionExpiry", () => {
  const policy = { idleMs: 30 * MINUTE_MS, absoluteMs: 12 * HOUR_MS };
  const loginAt = new Date("2026-10-01T00:00:00.000Z");

  test("アイドル期限と絶対期限の両方が残っていれば active で次のアイドル期限を返す", () => {
    const lastActiveAt = new Date(loginAt.getTime() + HOUR_MS);
    const now = new Date(lastActiveAt.getTime() + 10 * MINUTE_MS);

    expect(evaluateSessionExpiry({ loginAt, lastActiveAt, policy, now })).toEqual({
      status: "active",
      nextIdleDeadlineAt: new Date(lastActiveAt.getTime() + policy.idleMs),
    });
  });

  test("アイドル期限ちょうどは active、1ms 過ぎると idle で失効", () => {
    const lastActiveAt = loginAt;
    const deadline = new Date(lastActiveAt.getTime() + policy.idleMs);

    expect(evaluateSessionExpiry({ loginAt, lastActiveAt, policy, now: deadline }).status).toBe("active");
    expect(evaluateSessionExpiry({ loginAt, lastActiveAt, policy, now: new Date(deadline.getTime() + 1) })).toEqual({
      status: "expired",
      reason: "idle",
    });
  });

  test("操作し続けていても絶対期限を超えると absolute で失効", () => {
    const now = new Date(loginAt.getTime() + policy.absoluteMs + 1);
    const lastActiveAt = new Date(now.getTime() - MINUTE_MS);

    expect(evaluateSessionExpiry({ loginAt, lastActiveAt, policy, now })).toEqual({
      status: "expired",
      reason: "absolute",
    });
  });

  test("absoluteMs が null なら絶対期限では失効しない", () => {
    const unlimited = { idleMs: 48 * HOUR_MS, absoluteMs: null };
    const now = new Date(loginAt.getTime() + 365 * DAY_MS);
    const lastActiveAt = new Date(now.getTime() - HOUR_MS);

    expect(evaluateSessionExpiry({ loginAt, lastActiveAt, policy: unlimited, now }).status).toBe("active");
  });
});

describe("getCookieExpiryDate", () => {
  const loginAt = new Date("2026-10-01T00:00:00.000Z");

  test("絶対期限があればログイン時刻 + 絶対期限", () => {
    expect(getCookieExpiryDate({ loginAt, policy: { idleMs: MINUTE_MS, absoluteMs: 12 * HOUR_MS } })).toEqual(
      new Date(loginAt.getTime() + 12 * HOUR_MS),
    );
  });

  test("絶対期限が無い場合でも Cookie は 10 年で打ち切る（永久 Cookie にしない）", () => {
    expect(getCookieExpiryDate({ loginAt, policy: { idleMs: MINUTE_MS, absoluteMs: null } })).toEqual(
      new Date(loginAt.getTime() + 10 * 365 * DAY_MS),
    );
  });
});
