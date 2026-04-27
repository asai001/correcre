"use server";

import type { Route } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  MERCHANT_DEFAULT_REDIRECT_PATH,
  MERCHANT_FORGOT_PASSWORD_PATH,
  MERCHANT_LOGIN_NOTICE_COOKIE_NAME,
  MERCHANT_LOGIN_PATH,
  MERCHANT_NEW_PASSWORD_PATH,
} from "@merchant/lib/auth/constants";
import {
  mapAuthenticationErrorToCode,
  mapForgotPasswordConfirmErrorToCode,
  mapForgotPasswordRequestErrorToCode,
  mapNewPasswordErrorToCode,
  type LoginErrorCode,
  type LoginNoticeCode,
} from "@merchant/lib/auth/errors";
import { getMerchantUserForSession } from "@merchant/lib/auth/merchant";
import { sanitizeRedirectTo } from "@merchant/lib/auth/redirect";
import {
  clearMerchantSession,
  clearPendingNewPasswordChallenge,
  completeMerchantNewPassword,
  confirmMerchantPasswordReset,
  requestMerchantPasswordReset,
  signInMerchant,
} from "@merchant/lib/auth/session";
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
    name: MERCHANT_LOGIN_NOTICE_COOKIE_NAME,
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

  if (redirectTo !== MERCHANT_DEFAULT_REDIRECT_PATH) {
    params.set("from", redirectTo);
  }

  if (options?.email) {
    params.set("email", options.email);
  }

  const query = params.toString();
  return query ? `${MERCHANT_LOGIN_PATH}?${query}` : MERCHANT_LOGIN_PATH;
}

function buildNewPasswordRedirect(errorCode: LoginErrorCode | undefined, redirectTo: string) {
  const params = new URLSearchParams();

  if (errorCode) {
    params.set("error", errorCode);
  }

  if (redirectTo !== MERCHANT_DEFAULT_REDIRECT_PATH) {
    params.set("from", redirectTo);
  }

  const query = params.toString();
  return query ? `${MERCHANT_NEW_PASSWORD_PATH}?${query}` : MERCHANT_NEW_PASSWORD_PATH;
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

  if (params.redirectTo !== MERCHANT_DEFAULT_REDIRECT_PATH) {
    searchParams.set("from", params.redirectTo);
  }

  const query = searchParams.toString();
  return query ? `${MERCHANT_FORGOT_PASSWORD_PATH}?${query}` : MERCHANT_FORGOT_PASSWORD_PATH;
}

export async function authenticate(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = getFormValue(formData.get("email")).trim();
  const password = getFormValue(formData.get("password"));
  const redirectTo = sanitizeRedirectTo(getFormValue(formData.get("redirectTo")));
  let result: Awaited<ReturnType<typeof signInMerchant>>;

  if (!email || !password) {
    return {
      errorCode: "missing_fields",
    };
  }

  try {
    result = await signInMerchant({ email, password });
  } catch (error) {
    console.error("Merchant login failed", error);
    await clearMerchantSession();

    return {
      errorCode: mapAuthenticationErrorToCode(error),
    };
  }

  if (result.status === "new_password_required") {
    redirect(buildNewPasswordRedirect(undefined, redirectTo) as Route);
  }

  if (!(await getMerchantUserForSession(result.session))) {
    await clearMerchantSession();

    return {
      errorCode: "merchant_role_not_allowed",
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
    const session = await completeMerchantNewPassword({ newPassword });

    if (!(await getMerchantUserForSession(session))) {
      await clearMerchantSession();
      redirect(buildLoginRedirect(redirectTo) as Route);
    }
  } catch (error) {
    console.error("Merchant new password setup failed", error);
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
    await requestMerchantPasswordReset({ email });
  } catch (error) {
    console.error("Merchant password reset request failed", error);

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
    await confirmMerchantPasswordReset({ email, confirmationCode, newPassword });
  } catch (error) {
    console.error("Merchant password reset confirmation failed", error);

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
  await clearMerchantSession();
  redirect(MERCHANT_LOGIN_PATH);
}
