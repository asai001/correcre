"use server";

import type { Route } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  EMPLOYEE_DEFAULT_REDIRECT_PATH,
  EMPLOYEE_FORGOT_PASSWORD_PATH,
  EMPLOYEE_LOGIN_NOTICE_COOKIE_NAME,
  EMPLOYEE_LOGIN_PATH,
  EMPLOYEE_NEW_PASSWORD_PATH,
} from "@employee/lib/auth/constants";
import { getEmployeeUserForSession } from "@employee/lib/auth/current-user";
import {
  mapAuthenticationErrorToCode,
  mapForgotPasswordConfirmErrorToCode,
  mapForgotPasswordRequestErrorToCode,
  mapNewPasswordErrorToCode,
  type LoginErrorCode,
  type LoginNoticeCode,
} from "@employee/lib/auth/errors";
import { sanitizeRedirectTo } from "@employee/lib/auth/redirect";
import {
  clearEmployeeSession,
  clearPendingNewPasswordChallenge,
  completeEmployeeNewPassword,
  confirmEmployeePasswordReset,
  requestEmployeePasswordReset,
  signInEmployee,
} from "@employee/lib/auth/session";
import { isValidCognitoPassword } from "@correcre/lib/auth/password";

function getFormValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

type LoginActionState = {
  errorCode?: LoginErrorCode;
};

async function setLoginNoticeCookie(code: LoginNoticeCode) {
  const cookieStore = await cookies();

  cookieStore.set({
    name: EMPLOYEE_LOGIN_NOTICE_COOKIE_NAME,
    value: code,
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60,
  });
}

function buildLoginRedirect(redirectTo: string, options?: { email?: string }) {
  const params = new URLSearchParams();

  if (redirectTo !== EMPLOYEE_DEFAULT_REDIRECT_PATH) {
    params.set("from", redirectTo);
  }

  if (options?.email) {
    params.set("email", options.email);
  }

  const query = params.toString();
  return query ? `${EMPLOYEE_LOGIN_PATH}?${query}` : EMPLOYEE_LOGIN_PATH;
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

function buildForgotPasswordRedirect(params: {
  redirectTo: string;
  email?: string;
  errorCode?: LoginErrorCode;
  sent?: boolean;
}) {
  const searchParams = new URLSearchParams();

  if (params.errorCode) {
    searchParams.set("error", params.errorCode);
  }

  if (params.email) {
    searchParams.set("email", params.email);
  }

  if (params.sent) {
    searchParams.set("sent", "1");
  }

  if (params.redirectTo !== EMPLOYEE_DEFAULT_REDIRECT_PATH) {
    searchParams.set("from", params.redirectTo);
  }

  const query = searchParams.toString();
  return query ? `${EMPLOYEE_FORGOT_PASSWORD_PATH}?${query}` : EMPLOYEE_FORGOT_PASSWORD_PATH;
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

  if (!(await getEmployeeUserForSession(result.session))) {
    await clearEmployeeSession();

    return {
      errorCode: "employee_role_not_allowed",
    };
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
    const session = await completeEmployeeNewPassword({ newPassword });

    if (!(await getEmployeeUserForSession(session))) {
      await clearEmployeeSession();
      redirect(buildLoginRedirect(redirectTo) as Route);
    }
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

export async function requestPasswordReset(formData: FormData) {
  const email = getFormValue(formData.get("email")).trim();
  const redirectTo = sanitizeRedirectTo(getFormValue(formData.get("redirectTo")));

  if (!email) {
    redirect(buildForgotPasswordRedirect({ redirectTo, errorCode: "missing_email" }) as Route);
  }

  try {
    await requestEmployeePasswordReset({ email });
  } catch (error) {
    console.error("Employee password reset request failed", error);

    if (error instanceof Error && error.name === "UserNotFoundException") {
      redirect(buildForgotPasswordRedirect({ redirectTo, email, sent: true }) as Route);
    }

    redirect(
      buildForgotPasswordRedirect({
        redirectTo,
        email,
        errorCode: mapForgotPasswordRequestErrorToCode(error),
      }) as Route,
    );
  }

  redirect(buildForgotPasswordRedirect({ redirectTo, email, sent: true }) as Route);
}

export async function confirmPasswordReset(formData: FormData) {
  const email = getFormValue(formData.get("email")).trim();
  const confirmationCode = getFormValue(formData.get("confirmationCode")).trim();
  const newPassword = getFormValue(formData.get("newPassword"));
  const confirmPassword = getFormValue(formData.get("confirmPassword"));
  const redirectTo = sanitizeRedirectTo(getFormValue(formData.get("redirectTo")));

  if (!email) {
    redirect(buildForgotPasswordRedirect({ redirectTo, errorCode: "missing_email" }) as Route);
  }

  if (!confirmationCode || !newPassword || !confirmPassword) {
    redirect(buildForgotPasswordRedirect({ redirectTo, email, sent: true, errorCode: "missing_reset_fields" }) as Route);
  }

  if (!isValidCognitoPassword(newPassword)) {
    redirect(buildForgotPasswordRedirect({ redirectTo, email, sent: true, errorCode: "invalid_new_password" }) as Route);
  }

  if (newPassword !== confirmPassword) {
    redirect(
      buildForgotPasswordRedirect({
        redirectTo,
        email,
        sent: true,
        errorCode: "password_confirmation_mismatch",
      }) as Route,
    );
  }

  try {
    await confirmEmployeePasswordReset({ email, confirmationCode, newPassword });
  } catch (error) {
    console.error("Employee password reset confirmation failed", error);

    redirect(
      buildForgotPasswordRedirect({
        redirectTo,
        email,
        sent: true,
        errorCode: mapForgotPasswordConfirmErrorToCode(error),
      }) as Route,
    );
  }

  await setLoginNoticeCookie("password_reset_success");
  redirect(buildLoginRedirect(redirectTo, { email }) as Route);
}

export async function logout() {
  await clearEmployeeSession();
  redirect(EMPLOYEE_LOGIN_PATH);
}
