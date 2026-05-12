import type { SessionRole } from "@correcre/types";

export type SessionLifetimePolicy = {
  idleMs: number;
  /** `null` means no absolute upper bound. */
  absoluteMs: number | null;
};

export type SessionPolicy = {
  default: SessionLifetimePolicy;
  rememberMe: SessionLifetimePolicy;
};

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const EMPLOYEE_SESSION_POLICY: SessionPolicy = {
  default: { idleMs: 48 * HOUR_MS, absoluteMs: 30 * DAY_MS },
  rememberMe: { idleMs: 48 * HOUR_MS, absoluteMs: null },
};

const BACK_OFFICE_SESSION_POLICY: SessionPolicy = {
  default: { idleMs: 30 * MINUTE_MS, absoluteMs: 12 * HOUR_MS },
  rememberMe: { idleMs: 30 * MINUTE_MS, absoluteMs: 30 * DAY_MS },
};

export const SESSION_POLICIES: Record<SessionRole, SessionPolicy> = {
  EMPLOYEE: EMPLOYEE_SESSION_POLICY,
  ADMIN: BACK_OFFICE_SESSION_POLICY,
  OPERATOR: BACK_OFFICE_SESSION_POLICY,
  MERCHANT: BACK_OFFICE_SESSION_POLICY,
};

export function getSessionLifetimePolicy(role: SessionRole, rememberMe: boolean): SessionLifetimePolicy {
  const policy = SESSION_POLICIES[role];
  return rememberMe ? policy.rememberMe : policy.default;
}

export type SessionExpiryEvaluation =
  | { status: "active"; nextIdleDeadlineAt: Date }
  | { status: "expired"; reason: "idle" | "absolute" };

export function evaluateSessionExpiry(params: {
  loginAt: Date;
  lastActiveAt: Date;
  policy: SessionLifetimePolicy;
  now?: Date;
}): SessionExpiryEvaluation {
  const now = params.now ?? new Date();
  const idleDeadline = params.lastActiveAt.getTime() + params.policy.idleMs;

  if (now.getTime() > idleDeadline) {
    return { status: "expired", reason: "idle" };
  }

  if (params.policy.absoluteMs !== null) {
    const absoluteDeadline = params.loginAt.getTime() + params.policy.absoluteMs;

    if (now.getTime() > absoluteDeadline) {
      return { status: "expired", reason: "absolute" };
    }
  }

  return { status: "active", nextIdleDeadlineAt: new Date(idleDeadline) };
}

/**
 * The cookie should outlive the JWT slightly so we can still read and clear it
 * after server-side expiry checks. For the "no absolute limit" employee remember-me
 * case, cap the cookie at 10 years so it isn't effectively a permanent cookie.
 */
const NO_ABSOLUTE_LIMIT_COOKIE_TTL_MS = 10 * 365 * DAY_MS;

export function getCookieExpiryDate(params: {
  loginAt: Date;
  policy: SessionLifetimePolicy;
}): Date {
  if (params.policy.absoluteMs === null) {
    return new Date(params.loginAt.getTime() + NO_ABSOLUTE_LIMIT_COOKIE_TTL_MS);
  }

  return new Date(params.loginAt.getTime() + params.policy.absoluteMs);
}
