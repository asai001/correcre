"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { ADMIN_DEFAULT_REDIRECT_PATH, ADMIN_LOGIN_PATH, ADMIN_NEW_PASSWORD_PATH } from "@admin/lib/auth/constants";
import {
  mapAuthenticationErrorToCode,
  mapNewPasswordErrorToCode,
  type LoginErrorCode,
} from "@admin/lib/auth/errors";
import { sanitizeRedirectTo } from "@admin/lib/auth/redirect";
import {
  clearAdminSession,
  clearPendingNewPasswordChallenge,
  completeAdminNewPassword,
  signInAdmin,
} from "@admin/lib/auth/session";
import { isValidCognitoPassword } from "@correcre/lib/auth/password";

function getFormValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function buildLoginRedirect(errorCode: LoginErrorCode, redirectTo: string) {
  const params = new URLSearchParams({ error: errorCode });

  if (redirectTo !== ADMIN_DEFAULT_REDIRECT_PATH) {
    params.set("from", redirectTo);
  }

  return `${ADMIN_LOGIN_PATH}?${params.toString()}`;
}

function buildNewPasswordRedirect(errorCode: LoginErrorCode | undefined, redirectTo: string) {
  const params = new URLSearchParams();

  if (errorCode) {
    params.set("error", errorCode);
  }

  if (redirectTo !== ADMIN_DEFAULT_REDIRECT_PATH) {
    params.set("from", redirectTo);
  }

  const query = params.toString();
  return query ? `${ADMIN_NEW_PASSWORD_PATH}?${query}` : ADMIN_NEW_PASSWORD_PATH;
}

export async function authenticate(formData: FormData) {
  const email = getFormValue(formData.get("email")).trim();
  const password = getFormValue(formData.get("password"));
  const redirectTo = sanitizeRedirectTo(getFormValue(formData.get("redirectTo")));
  let result: Awaited<ReturnType<typeof signInAdmin>>;

  if (!email || !password) {
    redirect(buildLoginRedirect("missing_fields", redirectTo) as Route);
  }

  try {
    result = await signInAdmin({ email, password });
  } catch (error) {
    console.error("Admin login failed", error);
    await clearAdminSession();
    redirect(buildLoginRedirect(mapAuthenticationErrorToCode(error), redirectTo) as Route);
  }

  if (result.status === "new_password_required") {
    redirect(buildNewPasswordRedirect(undefined, redirectTo) as Route);
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

  try {
    await completeAdminNewPassword({ newPassword });
  } catch (error) {
    console.error("Admin new password setup failed", error);
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
  await clearAdminSession();
  redirect(ADMIN_LOGIN_PATH);
}
