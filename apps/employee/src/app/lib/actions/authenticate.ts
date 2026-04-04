"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { EMPLOYEE_LOGIN_PATH } from "@employee/lib/auth/constants";
import { mapAuthenticationErrorToCode, type LoginErrorCode } from "@employee/lib/auth/errors";
import { sanitizeRedirectTo } from "@employee/lib/auth/redirect";
import { clearEmployeeSession, signInEmployee } from "@employee/lib/auth/session";

function getFormValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

type LoginActionState = {
  errorCode?: LoginErrorCode;
};

export async function authenticate(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = getFormValue(formData.get("email")).trim();
  const password = getFormValue(formData.get("password"));
  const redirectTo = sanitizeRedirectTo(getFormValue(formData.get("redirectTo")));

  if (!email || !password) {
    return {
      errorCode: "missing_fields",
    };
  }

  try {
    await signInEmployee({ email, password });
  } catch (error) {
    console.error("Employee login failed", error);
    await clearEmployeeSession();

    return {
      errorCode: mapAuthenticationErrorToCode(error),
    };
  }

  redirect(redirectTo as Route);
}

export async function logout() {
  await clearEmployeeSession();
  redirect(EMPLOYEE_LOGIN_PATH);
}
