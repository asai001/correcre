import "server-only";

import { redirect } from "next/navigation";

import { ADMIN_DEFAULT_REDIRECT_PATH, ADMIN_LOGIN_PATH } from "./constants";
import { getAdminSession } from "./session";
import type { AdminSession } from "./verify-token";

const ADMIN_OPERATOR_EMAILS_ENV = "ADMIN_OPERATOR_EMAILS";

type OperatorAccessStatus =
  | {
      allowed: true;
      gateEnabled: boolean;
      session: AdminSession;
    }
  | {
      allowed: false;
      gateEnabled: boolean;
      reason: "unauthenticated" | "forbidden";
    };

function normalizeEmail(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function getOperatorEmailAllowlist() {
  return new Set(
    (process.env[ADMIN_OPERATOR_EMAILS_ENV] ?? "")
      .split(",")
      .map((value) => normalizeEmail(value))
      .filter(Boolean),
  );
}

export function isOperatorGateEnabled() {
  return getOperatorEmailAllowlist().size > 0;
}

export function isOperatorSession(session: AdminSession) {
  const allowlist = getOperatorEmailAllowlist();

  if (!allowlist.size) {
    return true;
  }

  const email = normalizeEmail(session.payload.email);
  return !!email && allowlist.has(email);
}

export async function getOperatorAccessStatus(): Promise<OperatorAccessStatus> {
  const session = await getAdminSession();
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
    if (access.reason === "unauthenticated") {
      redirect(ADMIN_LOGIN_PATH);
    }

    redirect(ADMIN_DEFAULT_REDIRECT_PATH);
  }

  return access.session;
}
