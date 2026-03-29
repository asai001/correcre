import type { JWTPayload } from "jose";
import { createRemoteJWKSet } from "jose/jwks/remote";
import { jwtVerify } from "jose/jwt/verify";

import { getEmployeeCognitoConfig } from "./config";

export type EmployeeIdTokenPayload = JWTPayload & {
  token_use?: string;
  email?: string;
  name?: string;
  "cognito:username"?: string;
};

export type EmployeeSession = {
  token: string;
  payload: EmployeeIdTokenPayload;
  expiresAt: Date;
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

export async function verifyEmployeeIdToken(idToken: string): Promise<EmployeeSession | null> {
  try {
    const { clientId, issuer } = getEmployeeCognitoConfig();
    const jwks = getJwks(`${issuer}/.well-known/jwks.json`);
    const { payload } = await jwtVerify(idToken, jwks, {
      issuer,
      audience: clientId,
      algorithms: ["RS256"],
    });

    if (payload.token_use !== "id" || typeof payload.exp !== "number") {
      return null;
    }

    return {
      token: idToken,
      payload: payload as EmployeeIdTokenPayload,
      expiresAt: new Date(payload.exp * 1000),
    };
  } catch {
    return null;
  }
}
