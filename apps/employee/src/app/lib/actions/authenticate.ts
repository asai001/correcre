"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { EMPLOYEE_DEFAULT_REDIRECT_PATH, EMPLOYEE_LOGIN_PATH } from "@employee/lib/auth/constants";
import { mapAuthenticationErrorToCode, type LoginErrorCode } from "@employee/lib/auth/errors";
import { sanitizeRedirectTo } from "@employee/lib/auth/redirect";
import { clearEmployeeSession, signInEmployee } from "@employee/lib/auth/session";

function getFormValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function buildLoginRedirect(errorCode: LoginErrorCode, redirectTo: string) {
  const params = new URLSearchParams({ error: errorCode });

  if (redirectTo !== EMPLOYEE_DEFAULT_REDIRECT_PATH) {
    params.set("from", redirectTo);
  }

  return `${EMPLOYEE_LOGIN_PATH}?${params.toString()}`;
}

export async function authenticate(formData: FormData) {
  const email = getFormValue(formData.get("email")).trim();
  const password = getFormValue(formData.get("password"));
  const redirectTo = sanitizeRedirectTo(getFormValue(formData.get("redirectTo")));

  if (!email || !password) {
    redirect(buildLoginRedirect("missing_fields", redirectTo) as Route);
  }

  try {
    await signInEmployee({ email, password });
  } catch (error) {
    console.error("Employee login failed", error);
    await clearEmployeeSession();
    redirect(buildLoginRedirect(mapAuthenticationErrorToCode(error), redirectTo) as Route);
  }

  redirect(redirectTo as Route);
}

export async function logout() {
  await clearEmployeeSession();
  redirect(EMPLOYEE_LOGIN_PATH);
}
