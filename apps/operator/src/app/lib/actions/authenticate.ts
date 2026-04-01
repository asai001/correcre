"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";

import {
  OPERATOR_DEFAULT_REDIRECT_PATH,
  OPERATOR_LOGIN_PATH,
  OPERATOR_NEW_PASSWORD_PATH,
} from "@operator/lib/auth/constants";
import { isOperatorAllowlistConfigured, isOperatorEmailAllowed } from "@operator/lib/auth/allowlist";
import {
  mapAuthenticationErrorToCode,
  mapNewPasswordErrorToCode,
  type LoginErrorCode,
} from "@operator/lib/auth/errors";
import { sanitizeRedirectTo } from "@operator/lib/auth/redirect";
import {
  clearOperatorSession,
  clearPendingNewPasswordChallenge,
  completeOperatorNewPassword,
  signInOperator,
} from "@operator/lib/auth/session";
import { isValidCognitoPassword } from "@correcre/lib/auth/password";

function getFormValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function buildLoginRedirect(errorCode: LoginErrorCode, redirectTo: string) {
  const params = new URLSearchParams({ error: errorCode });

  if (redirectTo !== OPERATOR_DEFAULT_REDIRECT_PATH) {
    params.set("from", redirectTo);
  }

  return `${OPERATOR_LOGIN_PATH}?${params.toString()}`;
}

function buildNewPasswordRedirect(errorCode: LoginErrorCode | undefined, redirectTo: string) {
  const params = new URLSearchParams();

  if (errorCode) {
    params.set("error", errorCode);
  }

  if (redirectTo !== OPERATOR_DEFAULT_REDIRECT_PATH) {
    params.set("from", redirectTo);
  }

  const query = params.toString();
  return query ? `${OPERATOR_NEW_PASSWORD_PATH}?${query}` : OPERATOR_NEW_PASSWORD_PATH;
}

export async function authenticate(formData: FormData) {
  const email = getFormValue(formData.get("email")).trim();
  const password = getFormValue(formData.get("password"));
  const redirectTo = sanitizeRedirectTo(getFormValue(formData.get("redirectTo")));
  let result: Awaited<ReturnType<typeof signInOperator>>;

  if (!email || !password) {
    redirect(buildLoginRedirect("missing_fields", redirectTo) as Route);
  }

  if (!isOperatorAllowlistConfigured()) {
    await clearOperatorSession();
    redirect(buildLoginRedirect("operator_allowlist_not_configured", redirectTo) as Route);
  }

  if (!isOperatorEmailAllowed(email)) {
    await clearOperatorSession();
    redirect(buildLoginRedirect("operator_email_not_allowed", redirectTo) as Route);
  }

  try {
    result = await signInOperator({ email, password });
  } catch (error) {
    console.error("Operator login failed", error);
    await clearOperatorSession();
    redirect(buildLoginRedirect(mapAuthenticationErrorToCode(error), redirectTo) as Route);
  }

  if (result.status === "new_password_required") {
    redirect(buildNewPasswordRedirect(undefined, redirectTo) as Route);
  }

  if (!isOperatorEmailAllowed(result.session.payload.email as string | undefined)) {
    await clearOperatorSession();
    redirect(buildLoginRedirect("operator_email_not_allowed", redirectTo) as Route);
  }

  redirect(redirectTo as Route);
}

export async function completeNewPassword(formData: FormData) {
  const newPassword = getFormValue(formData.get("newPassword"));
  const confirmPassword = getFormValue(formData.get("confirmPassword"));
  const redirectTo = sanitizeRedirectTo(getFormValue(formData.get("redirectTo")));

  if (!newPassword || !confirmPassword) {
    redirect(buildNewPasswordRedirect("missing_fields", redirectTo) as Route);
  }

  if (!isValidCognitoPassword(newPassword)) {
    redirect(buildNewPasswordRedirect("invalid_new_password", redirectTo) as Route);
  }

  if (newPassword !== confirmPassword) {
    redirect(buildNewPasswordRedirect("password_confirmation_mismatch", redirectTo) as Route);
  }

  if (!isOperatorAllowlistConfigured()) {
    await clearOperatorSession();
    redirect(buildLoginRedirect("operator_allowlist_not_configured", redirectTo) as Route);
  }

  try {
    const session = await completeOperatorNewPassword({ newPassword });

    if (!isOperatorEmailAllowed(session.payload.email as string | undefined)) {
      await clearOperatorSession();
      redirect(buildLoginRedirect("operator_email_not_allowed", redirectTo) as Route);
    }
  } catch (error) {
    console.error("Operator new password setup failed", error);
    const errorCode = mapNewPasswordErrorToCode(error);

    if (errorCode === "new_password_session_expired") {
      await clearPendingNewPasswordChallenge();
      redirect(buildLoginRedirect(errorCode, redirectTo) as Route);
    }

    redirect(buildNewPasswordRedirect(errorCode, redirectTo) as Route);
  }

  redirect(redirectTo as Route);
}

export async function logout() {
  await clearOperatorSession();
  redirect(OPERATOR_LOGIN_PATH);
}
