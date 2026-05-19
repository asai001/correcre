"use client";

import Link from "next/link";
import type { Route } from "next";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";

import { Alert, Button, Checkbox, TextField } from "@mui/material";
import { PasswordTextField } from "@correcre/theme";

import { authenticate } from "@admin/app/lib/actions/authenticate";
import {
  ADMIN_DEFAULT_REDIRECT_PATH,
  ADMIN_FORGOT_PASSWORD_PATH,
  ADMIN_LOGIN_NOTICE_COOKIE_NAME,
} from "@admin/lib/auth/constants";
import { getLoginErrorMessage, type LoginErrorCode } from "@admin/lib/auth/errors";

type LoginFormProps = {
  defaultEmail?: string;
  noticeMessage?: string;
  redirectTo?: string;
};

function buildForgotPasswordHref(redirectTo: string) {
  if (redirectTo === ADMIN_DEFAULT_REDIRECT_PATH) {
    return ADMIN_FORGOT_PASSWORD_PATH;
  }

  const params = new URLSearchParams({ from: redirectTo });
  return `${ADMIN_FORGOT_PASSWORD_PATH}?${params.toString()}`;
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="contained"
      color="primary"
      fullWidth
      disabled={pending}
      sx={{ my: 5, py: 1.5 }}
    >
      {pending ? "ログイン中..." : "ログイン"}
    </Button>
  );
}

export default function LoginForm({
  defaultEmail = "",
  noticeMessage,
  redirectTo = "/dashboard",
}: LoginFormProps) {
  const [state, formAction] = useActionState(authenticate, {
    errorCode: undefined as LoginErrorCode | undefined,
  });
  const errorMessage = getLoginErrorMessage(state.errorCode);
  const forgotPasswordHref = buildForgotPasswordHref(redirectTo);

  useEffect(() => {
    if (!noticeMessage) {
      return;
    }

    document.cookie = `${ADMIN_LOGIN_NOTICE_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
  }, [noticeMessage]);

  return (
    <div className="w-full rounded bg-[#D8FAFF]/40 pt-15">
      <div className="mx-auto w-4/5">
        <form action={formAction}>
          <input type="hidden" name="redirectTo" value={redirectTo} />

          {noticeMessage ? (
            <Alert severity="success" sx={{ mb: 3 }}>
              {noticeMessage}
            </Alert>
          ) : null}

          {errorMessage ? (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errorMessage}
            </Alert>
          ) : null}

          <div>
            <span className="text-neutral-600">メールアドレス</span>
            <TextField
              className="bg-white"
              fullWidth
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              defaultValue={defaultEmail}
              required
              variant="outlined"
              size="small"
            />
          </div>

          <div className="mt-5">
            <span className="text-neutral-600">パスワード</span>
            <PasswordTextField
              className="bg-white"
              fullWidth
              id="password"
              name="password"
              autoComplete="current-password"
              required
              variant="outlined"
              size="small"
            />
          </div>

          <div className="mt-5">
            <Checkbox id="login-info" name="login-info" size="small" sx={{ p: 0, pr: 1 }} />
            <label htmlFor="login-info" className="text-neutral-600">
              ログイン情報を保存
            </label>
          </div>

          <p className="mt-2 text-sm text-neutral-600">
            パスワードを忘れた方は{" "}
            <Link
              href={forgotPasswordHref as Route}
              className="font-semibold text-blue-700 underline-offset-2 hover:underline"
            >
              こちら
            </Link>{" "}
            から再設定してください。
          </p>

          <SubmitButton />
        </form>
      </div>
    </div>
  );
}
