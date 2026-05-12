import {
  evaluateSessionExpiry,
  getCookieExpiryDate,
  getSessionLifetimePolicy,
  type SessionLifetimePolicy,
} from "./session-policy";
import { signSessionToken, type SessionTokenPayload } from "./session-token";

import type { SessionRole } from "@correcre/types";

export type ValidatedSession = {
  sessionId: string;
  role: SessionRole;
  cognitoSub: string;
  email?: string;
  name?: string;
  cognitoUsername?: string;
  loginAt: Date;
  lastActiveAt: Date;
  rememberMe: boolean;
  policy: SessionLifetimePolicy;
  cookieExpiresAt: Date;
  payload: SessionTokenPayload;
};

export type SessionTokenEvaluation =
  | { status: "active"; session: ValidatedSession }
  | { status: "expired"; reason: "idle" | "absolute" | "policy-mismatch" };

/**
 * Pure (edge-safe) check of a decoded session token against its lifetime policy.
 * Does not perform DB lookups.
 */
export function evaluateSessionToken(payload: SessionTokenPayload, options?: { now?: Date }): SessionTokenEvaluation {
  const policy = getSessionLifetimePolicy(payload.role, payload.rememberMe);

  // Defend against tampered/stale tokens whose embedded policy diverges from current code.
  if (policy.idleMs !== payload.idleMs || policy.absoluteMs !== payload.absoluteMs) {
    return { status: "expired", reason: "policy-mismatch" };
  }

  const loginAt = new Date(payload.loginAt);
  const lastActiveAt = new Date(payload.lastActiveAt);
  const evaluation = evaluateSessionExpiry({ loginAt, lastActiveAt, policy, now: options?.now });

  if (evaluation.status === "expired") {
    return { status: "expired", reason: evaluation.reason };
  }

  return {
    status: "active",
    session: {
      sessionId: payload.sid,
      role: payload.role,
      cognitoSub: payload.sub,
      email: payload.email,
      name: payload.name,
      cognitoUsername: payload.cognitoUsername,
      loginAt,
      lastActiveAt,
      rememberMe: payload.rememberMe,
      policy,
      cookieExpiresAt: getCookieExpiryDate({ loginAt, policy }),
      payload,
    },
  };
}

const DEFAULT_TOUCH_INTERVAL_MS = 60 * 1000;

export type TouchedSession = {
  token: string;
  payload: SessionTokenPayload;
  cookieExpiresAt: Date;
};

/**
 * If enough time has passed since the last activity update, reissue the JWT
 * with a fresh `lastActiveAt`. Otherwise return `null` and reuse the existing token.
 */
export async function maybeTouchSessionToken(
  payload: SessionTokenPayload,
  options?: { now?: Date; touchIntervalMs?: number },
): Promise<TouchedSession | null> {
  const now = options?.now ?? new Date();
  const touchIntervalMs = options?.touchIntervalMs ?? DEFAULT_TOUCH_INTERVAL_MS;

  if (now.getTime() - payload.lastActiveAt < touchIntervalMs) {
    return null;
  }

  const refreshed: SessionTokenPayload = { ...payload, lastActiveAt: now.getTime() };
  const cookieExpiresAt = getCookieExpiryDate({
    loginAt: new Date(payload.loginAt),
    policy: getSessionLifetimePolicy(payload.role, payload.rememberMe),
  });
  const token = await signSessionToken(refreshed, cookieExpiresAt);
  return { token, payload: refreshed, cookieExpiresAt };
}
