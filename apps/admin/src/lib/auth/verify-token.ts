import { evaluateSessionToken, type ValidatedSession } from "@correcre/lib/auth/session-validate";
import { verifySessionToken } from "@correcre/lib/auth/session-token";

export type AdminSession = ValidatedSession;

export async function verifyAdminSessionToken(
  token: string,
  options?: { now?: Date },
): Promise<AdminSession | null> {
  const payload = await verifySessionToken(token);

  if (!payload || payload.role !== "ADMIN") {
    return null;
  }

  const result = evaluateSessionToken(payload, options);

  if (result.status === "expired") {
    return null;
  }

  return result.session;
}
