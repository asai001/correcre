import { evaluateSessionToken, type ValidatedSession } from "@correcre/lib/auth/session-validate";
import { verifySessionToken } from "@correcre/lib/auth/session-token";

export type OperatorSession = ValidatedSession;

export async function verifyOperatorSessionToken(
  token: string,
  options?: { now?: Date },
): Promise<OperatorSession | null> {
  const payload = await verifySessionToken(token);

  if (!payload || payload.role !== "OPERATOR") {
    return null;
  }

  const result = evaluateSessionToken(payload, options);

  if (result.status === "expired") {
    return null;
  }

  return result.session;
}
