import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

import type { SessionRole } from "@correcre/types";

export type SessionTokenPayload = {
  sid: string;
  sub: string;
  role: SessionRole;
  email?: string;
  name?: string;
  cognitoUsername?: string;
  loginAt: number;
  lastActiveAt: number;
  rememberMe: boolean;
  idleMs: number;
  absoluteMs: number | null;
};

const SIGNING_ALGORITHM = "HS256";

let cachedSecret: Uint8Array | null = null;

function getSigningSecret(): Uint8Array {
  if (cachedSecret) {
    return cachedSecret;
  }

  const raw = process.env.SESSION_SECRET?.trim();

  if (!raw) {
    throw new Error("SESSION_SECRET is not set.");
  }

  if (raw.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters.");
  }

  cachedSecret = new TextEncoder().encode(raw);
  return cachedSecret;
}

export async function signSessionToken(payload: SessionTokenPayload, expiresAt: Date): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: SIGNING_ALGORITHM })
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(getSigningSecret());
}

function isSessionRole(value: unknown): value is SessionRole {
  return value === "ADMIN" || value === "EMPLOYEE" || value === "OPERATOR" || value === "MERCHANT";
}

export async function verifySessionToken(token: string): Promise<SessionTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSigningSecret(), { algorithms: [SIGNING_ALGORITHM] });

    if (
      typeof payload.sid !== "string" ||
      typeof payload.sub !== "string" ||
      !isSessionRole(payload.role) ||
      typeof payload.loginAt !== "number" ||
      typeof payload.lastActiveAt !== "number" ||
      typeof payload.rememberMe !== "boolean" ||
      typeof payload.idleMs !== "number" ||
      (payload.absoluteMs !== null && typeof payload.absoluteMs !== "number")
    ) {
      return null;
    }

    return {
      sid: payload.sid,
      sub: payload.sub,
      role: payload.role,
      email: typeof payload.email === "string" ? payload.email : undefined,
      name: typeof payload.name === "string" ? payload.name : undefined,
      cognitoUsername: typeof payload.cognitoUsername === "string" ? payload.cognitoUsername : undefined,
      loginAt: payload.loginAt,
      lastActiveAt: payload.lastActiveAt,
      rememberMe: payload.rememberMe,
      idleMs: payload.idleMs,
      absoluteMs: payload.absoluteMs ?? null,
    };
  } catch {
    return null;
  }
}
