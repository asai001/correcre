"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { ADMIN_DEFAULT_REDIRECT_PATH, ADMIN_LOGIN_PATH } from "@admin/lib/auth/constants";
import { mapAuthenticationErrorToCode, type LoginErrorCode } from "@admin/lib/auth/errors";
import { sanitizeRedirectTo } from "@admin/lib/auth/redirect";
import { clearAdminSession, signInAdmin } from "@admin/lib/auth/session";

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

export async function authenticate(formData: FormData) {
  const email = getFormValue(formData.get("email")).trim();
  const password = getFormValue(formData.get("password"));
  const redirectTo = sanitizeRedirectTo(getFormValue(formData.get("redirectTo")));

  if (!email || !password) {
    redirect(buildLoginRedirect("missing_fields", redirectTo) as Route);
  }

  try {
    await signInAdmin({ email, password });
  } catch (error) {
    console.error("Admin login failed", error);
    await clearAdminSession();
    redirect(buildLoginRedirect(mapAuthenticationErrorToCode(error), redirectTo) as Route);
  }

  redirect(redirectTo as Route);
}

export async function logout() {
  await clearAdminSession();
  redirect(ADMIN_LOGIN_PATH);
}
