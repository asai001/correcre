"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert, Button, Checkbox, TextField } from "@mui/material";
import { PasswordTextField } from "@correcre/theme";

import { authenticate } from "@operator/app/lib/actions/authenticate";
import { OPERATOR_DEFAULT_REDIRECT_PATH } from "@operator/lib/auth/constants";
import { getLoginErrorMessage, type LoginErrorCode } from "@operator/lib/auth/errors";

type LoginFormProps = {
  redirectTo?: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="contained" color="primary" fullWidth disabled={pending} sx={{ my: 5, py: 1.5 }}>
      {pending ? "ログイン中..." : "ログイン"}
    </Button>
  );
}

export default function LoginForm({ redirectTo = OPERATOR_DEFAULT_REDIRECT_PATH }: LoginFormProps) {
  const [state, formAction] = useActionState(authenticate, {
    errorCode: undefined as LoginErrorCode | undefined,
  });
  const errorMessage = getLoginErrorMessage(state.errorCode);

  return (
    <div className="w-full rounded bg-[#D8FAFF]/40 pt-15">
      <div className="mx-auto w-4/5">
        <form action={formAction}>
          <input type="hidden" name="redirectTo" value={redirectTo} />

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
              ログイン情報を記憶する
            </label>
          </div>

          <p className="mt-2 text-sm text-neutral-600">パスワードを忘れた場合は、運用担当者へお問い合わせください。</p>

          <SubmitButton />
        </form>
      </div>
    </div>
  );
}
