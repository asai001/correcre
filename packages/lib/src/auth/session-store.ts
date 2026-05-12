import "server-only";

import { randomUUID } from "node:crypto";

import type { JWTPayload } from "jose";
import { createRemoteJWKSet } from "jose/jwks/remote";
import { jwtVerify } from "jose/jwt/verify";

import type { DBSessionItem, SessionRole } from "@correcre/types";

import {
  buildSessionByCognitoSubGsiPk,
  buildSessionByCognitoSubGsiSk,
  buildSessionPk,
  deleteSession as deleteSessionRecord,
  getSession as getSessionRecord,
  putSession,
  revokeAllSessionsByCognitoSub,
  updateSessionLastActiveAt,
  type SessionTableConfig,
} from "../dynamodb/session";
import { readRequiredServerEnv } from "../env/server";

import { getCookieExpiryDate, getSessionLifetimePolicy } from "./session-policy";
import { signSessionToken, type SessionTokenPayload } from "./session-token";

export type CognitoIdTokenClaims = JWTPayload & {
  token_use?: string;
  email?: string;
  name?: string;
  "cognito:username"?: string;
};

export type SessionUserClaims = {
  cognitoSub: string;
  email?: string;
  name?: string;
  cognitoUsername?: string;
};

export type CreatedSession = {
  sessionId: string;
  token: string;
  cookieExpiresAt: Date;
  payload: SessionTokenPayload;
  record: DBSessionItem;
};

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJwks(jwksUri: string) {
  const cached = jwksCache.get(jwksUri);

  if (cached) {
    return cached;
  }

  const jwks = createRemoteJWKSet(new URL(jwksUri));
  jwksCache.set(jwksUri, jwks);
  return jwks;
}

export async function verifyCognitoIdToken(params: {
  idToken: string;
  issuer: string;
  audience: string;
}): Promise<{ claims: CognitoIdTokenClaims; expiresAt: Date } | null> {
  try {
    const jwks = getJwks(`${params.issuer}/.well-known/jwks.json`);
    const { payload } = await jwtVerify(params.idToken, jwks, {
      issuer: params.issuer,
      audience: params.audience,
      algorithms: ["RS256"],
    });

    if (payload.token_use !== "id" || typeof payload.exp !== "number" || typeof payload.sub !== "string") {
      return null;
    }

    return {
      claims: payload as CognitoIdTokenClaims,
      expiresAt: new Date(payload.exp * 1000),
    };
  } catch {
    return null;
  }
}

export function getSessionTableConfig(): SessionTableConfig {
  return {
    region: readRequiredServerEnv("AWS_REGION"),
    tableName: readRequiredServerEnv("DDB_SESSION_TABLE_NAME"),
  };
}

export function extractUserClaims(claims: CognitoIdTokenClaims): SessionUserClaims | null {
  const cognitoSub = typeof claims.sub === "string" ? claims.sub.trim() : "";

  if (!cognitoSub) {
    return null;
  }

  return {
    cognitoSub,
    email: typeof claims.email === "string" ? claims.email : undefined,
    name: typeof claims.name === "string" ? claims.name : undefined,
    cognitoUsername: typeof claims["cognito:username"] === "string" ? claims["cognito:username"] : undefined,
  };
}

export async function createSession(params: {
  role: SessionRole;
  claims: SessionUserClaims;
  rememberMe: boolean;
  ipAddress?: string;
  userAgent?: string;
  now?: Date;
}): Promise<CreatedSession> {
  const now = params.now ?? new Date();
  const policy = getSessionLifetimePolicy(params.role, params.rememberMe);
  const sessionId = randomUUID();
  const loginAt = now;
  const lastActiveAt = now;
  const cookieExpiresAt = getCookieExpiryDate({ loginAt, policy });
  const ttl = Math.floor(cookieExpiresAt.getTime() / 1000);

  const record: DBSessionItem = {
    pk: buildSessionPk(sessionId),
    sessionId,
    role: params.role,
    cognitoSub: params.claims.cognitoSub,
    email: params.claims.email,
    name: params.claims.name,
    cognitoUsername: params.claims.cognitoUsername,
    loginAt: loginAt.toISOString(),
    lastActiveAt: lastActiveAt.toISOString(),
    rememberMe: params.rememberMe,
    idleMs: policy.idleMs,
    absoluteMs: policy.absoluteMs,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    ttl,
    gsi1pk: buildSessionByCognitoSubGsiPk(params.claims.cognitoSub),
    gsi1sk: buildSessionByCognitoSubGsiSk(loginAt.toISOString()),
  };

  await putSession(getSessionTableConfig(), record);

  const payload: SessionTokenPayload = {
    sid: sessionId,
    sub: params.claims.cognitoSub,
    role: params.role,
    email: params.claims.email,
    name: params.claims.name,
    cognitoUsername: params.claims.cognitoUsername,
    loginAt: loginAt.getTime(),
    lastActiveAt: lastActiveAt.getTime(),
    rememberMe: params.rememberMe,
    idleMs: policy.idleMs,
    absoluteMs: policy.absoluteMs,
  };

  const token = await signSessionToken(payload, cookieExpiresAt);

  return { sessionId, token, cookieExpiresAt, payload, record };
}

export async function persistTouchedLastActiveAt(sessionId: string, lastActiveAt: Date): Promise<void> {
  try {
    await updateSessionLastActiveAt(getSessionTableConfig(), sessionId, lastActiveAt.toISOString());
  } catch (error) {
    console.warn("Failed to persist session lastActiveAt update.", error);
  }
}

export async function loadActiveSessionRecord(sessionId: string): Promise<DBSessionItem | null> {
  const record = await getSessionRecord(getSessionTableConfig(), sessionId);

  if (!record || record.revokedAt) {
    return null;
  }

  return record;
}

export async function terminateSession(sessionId: string): Promise<void> {
  await deleteSessionRecord(getSessionTableConfig(), sessionId);
}

export async function revokeSessionsForCognitoSub(cognitoSub: string): Promise<number> {
  return await revokeAllSessionsByCognitoSub(getSessionTableConfig(), cognitoSub);
}
