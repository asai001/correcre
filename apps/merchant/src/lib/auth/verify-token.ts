import { evaluateSessionToken, type ValidatedSession } from "@correcre/lib/auth/session-validate";
import { verifySessionToken } from "@correcre/lib/auth/session-token";

export type MerchantSession = ValidatedSession;

export async function verifyMerchantSessionToken(
  token: string,
  options?: { now?: Date },
): Promise<MerchantSession | null> {
  const payload = await verifySessionToken(token);

  if (!payload || payload.role !== "MERCHANT") {
    return null;
  }

  const result = evaluateSessionToken(payload, options);

  if (result.status === "expired") {
    return null;
  }

  return result.session;
}
