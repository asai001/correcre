import { evaluateSessionToken, type ValidatedSession } from "@correcre/lib/auth/session-validate";
import { verifySessionToken } from "@correcre/lib/auth/session-token";

export type EmployeeSession = ValidatedSession;

export async function verifyEmployeeSessionToken(
  token: string,
  options?: { now?: Date },
): Promise<EmployeeSession | null> {
  const payload = await verifySessionToken(token);

  if (!payload || payload.role !== "EMPLOYEE") {
    return null;
  }

  const result = evaluateSessionToken(payload, options);

  if (result.status === "expired") {
    return null;
  }

  return result.session;
}
