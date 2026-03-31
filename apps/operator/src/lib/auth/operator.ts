import "server-only";

import { redirect } from "next/navigation";

import { OPERATOR_LOGIN_PATH } from "./constants";
import { isOperatorAllowlistConfigured, isOperatorEmailAllowed } from "./allowlist";
import { clearOperatorSession, getOperatorSession } from "./session";
import type { OperatorSession } from "./verify-token";

type OperatorAccessStatus =
  | {
      allowed: true;
      gateEnabled: boolean;
      session: OperatorSession;
    }
  | {
      allowed: false;
      gateEnabled: boolean;
      reason: "unauthenticated" | "forbidden";
    };

export function isOperatorGateEnabled() {
  return isOperatorAllowlistConfigured();
}

export function isOperatorSession(session: OperatorSession) {
  return isOperatorEmailAllowed(session.payload.email as string | undefined);
}

export async function getOperatorAccessStatus(): Promise<OperatorAccessStatus> {
  const session = await getOperatorSession();
  const gateEnabled = isOperatorGateEnabled();

  if (!session) {
    return { allowed: false, gateEnabled, reason: "unauthenticated" };
  }

  if (!isOperatorSession(session)) {
    return { allowed: false, gateEnabled, reason: "forbidden" };
  }

  return {
    allowed: true,
    gateEnabled,
    session,
  };
}

export async function requireOperatorSession() {
  const access = await getOperatorAccessStatus();

  if (!access.allowed) {
    await clearOperatorSession();
    redirect(OPERATOR_LOGIN_PATH);
  }

  return access.session;
}
