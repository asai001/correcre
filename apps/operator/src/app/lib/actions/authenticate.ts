"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";

import {
  OPERATOR_DEFAULT_REDIRECT_PATH,
  OPERATOR_LOGIN_PATH,
  OPERATOR_NEW_PASSWORD_PATH,
} from "@operator/lib/auth/constants";
import {
  mapAuthenticationErrorToCode,
  mapNewPasswordErrorToCode,
  type LoginErrorCode,
} from "@operator/lib/auth/errors";
import { getOperatorUserForSession } from "@operator/lib/auth/operator";
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

type LoginActionState = {
  errorCode?: LoginErrorCode;
};

function buildLoginRedirect(redirectTo: string) {
  if (redirectTo === OPERATOR_DEFAULT_REDIRECT_PATH) {
    return OPERATOR_LOGIN_PATH;
  }

  const params = new URLSearchParams({ from: redirectTo });
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

export async function authenticate(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = getFormValue(formData.get("email")).trim();
  const password = getFormValue(formData.get("password"));
  const redirectTo = sanitizeRedirectTo(getFormValue(formData.get("redirectTo")));
  let result: Awaited<ReturnType<typeof signInOperator>>;

  if (!email || !password) {
    return {
      errorCode: "missing_fields",
    };
  }

  try {
    result = await signInOperator({ email, password });
  } catch (error) {
    console.error("Operator login failed", error);
    await clearOperatorSession();

    return {
      errorCode: mapAuthenticationErrorToCode(error),
    };
  }

  if (result.status === "new_password_required") {
    redirect(buildNewPasswordRedirect(undefined, redirectTo) as Route);
  }

  if (!(await getOperatorUserForSession(result.session))) {
    await clearOperatorSession();

    return {
      errorCode: "operator_role_not_allowed",
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
    const session = await completeOperatorNewPassword({ newPassword });

    if (!(await getOperatorUserForSession(session))) {
      await clearOperatorSession();
      redirect(buildLoginRedirect(redirectTo) as Route);
    }
  } catch (error) {
    console.error("Operator new password setup failed", error);
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
  await clearOperatorSession();
  redirect(OPERATOR_LOGIN_PATH);
}
