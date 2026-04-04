"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";

import {
  EMPLOYEE_DEFAULT_REDIRECT_PATH,
  EMPLOYEE_LOGIN_PATH,
  EMPLOYEE_NEW_PASSWORD_PATH,
} from "@employee/lib/auth/constants";
import {
  mapAuthenticationErrorToCode,
  mapNewPasswordErrorToCode,
  type LoginErrorCode,
} from "@employee/lib/auth/errors";
import { sanitizeRedirectTo } from "@employee/lib/auth/redirect";
import {
  clearEmployeeSession,
  clearPendingNewPasswordChallenge,
  completeEmployeeNewPassword,
  signInEmployee,
} from "@employee/lib/auth/session";
import { isValidCognitoPassword } from "@correcre/lib/auth/password";

function getFormValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

type LoginActionState = {
  errorCode?: LoginErrorCode;
};

function buildLoginRedirect(redirectTo: string) {
  if (redirectTo === EMPLOYEE_DEFAULT_REDIRECT_PATH) {
    return EMPLOYEE_LOGIN_PATH;
  }

  const params = new URLSearchParams({ from: redirectTo });
  return `${EMPLOYEE_LOGIN_PATH}?${params.toString()}`;
}

function buildNewPasswordRedirect(errorCode: LoginErrorCode | undefined, redirectTo: string) {
  const params = new URLSearchParams();

  if (errorCode) {
    params.set("error", errorCode);
  }

  if (redirectTo !== EMPLOYEE_DEFAULT_REDIRECT_PATH) {
    params.set("from", redirectTo);
  }

  const query = params.toString();
  return query ? `${EMPLOYEE_NEW_PASSWORD_PATH}?${query}` : EMPLOYEE_NEW_PASSWORD_PATH;
}

export async function authenticate(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = getFormValue(formData.get("email")).trim();
  const password = getFormValue(formData.get("password"));
  const redirectTo = sanitizeRedirectTo(getFormValue(formData.get("redirectTo")));
  let result: Awaited<ReturnType<typeof signInEmployee>>;

  if (!email || !password) {
    return {
      errorCode: "missing_fields",
    };
  }

  try {
    result = await signInEmployee({ email, password });
  } catch (error) {
    console.error("Employee login failed", error);
    await clearEmployeeSession();

    return {
      errorCode: mapAuthenticationErrorToCode(error),
    };
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
    await completeEmployeeNewPassword({ newPassword });
  } catch (error) {
    console.error("Employee new password setup failed", error);
    const errorCode = mapNewPasswordErrorToCode(error);

    if (errorCode === "new_password_session_expired") {
      await clearPendingNewPasswordChallenge();
      redirect(buildLoginRedirect(redirectTo) as Route);
    }

    redirect(buildNewPasswordRedirect(errorCode, redirectTo) as Route);
  }

  redirect(redirectTo as Route);
}

export async function logout() {
  await clearEmployeeSession();
  redirect(EMPLOYEE_LOGIN_PATH);
}
