"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import { Alert, Button, TextField } from "@mui/material";
import { PasswordTextField } from "@correcre/theme";

import { confirmPasswordReset, requestPasswordReset } from "@merchant/app/lib/actions/authenticate";
import {
  MERCHANT_DEFAULT_REDIRECT_PATH,
  MERCHANT_LOGIN_PATH,
} from "@merchant/lib/auth/constants";
import { COGNITO_PASSWORD_RULE_TEXT, isValidCognitoPassword } from "@correcre/lib/auth/password";
import { merchantAuthCardClassName } from "./styles";

type ForgotPasswordFormProps = {
  email?: string;
  emailSent?: boolean;
  errorMessage?: string;
  redirectTo?: string;
};

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    backgroundColor: "#ffffff",
  },
  "& .MuiFormHelperText-root": {
    marginLeft: 0,
    marginRight: 0,
  },
};

function buildLoginHref(redirectTo: string) {
  if (redirectTo === MERCHANT_DEFAULT_REDIRECT_PATH) {
    return MERCHANT_LOGIN_PATH;
  }

  const params = new URLSearchParams({ from: redirectTo });
  return `${MERCHANT_LOGIN_PATH}?${params.toString()}`;
}

function RequestCodeButton({ sent }: { sent: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outlined" fullWidth disabled={pending} sx={{ mt: 3, py: 1.5 }}>
      {pending ? "送信中..." : sent ? "認証コードを再送" : "認証コードを送信"}
    </Button>
  );
}

function ResetPasswordButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="contained" color="primary" fullWidth disabled={pending} sx={{ mt: 4, py: 1.5 }}>
      {pending ? "更新中..." : "パスワードを再設定"}
    </Button>
  );
}

export default function ForgotPasswordForm({
  email = "",
  emailSent = false,
  errorMessage,
  redirectTo = MERCHANT_DEFAULT_REDIRECT_PATH,
}: ForgotPasswordFormProps) {
  const [confirmationCode, setConfirmationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const isMissingConfirmationCode = !confirmationCode.trim();
  const isMissingNewPassword = !newPassword.trim();
  const isMissingConfirmPassword = !confirmPassword.trim();
  const isPasswordInvalid = !!newPassword && !isValidCognitoPassword(newPassword);
  const isPasswordMismatch = !!newPassword && !!confirmPassword && newPassword !== confirmPassword;
  const loginHref = buildLoginHref(redirectTo);

  return (
    <div className={merchantAuthCardClassName}>
      <div className="mx-auto w-4/5 pb-8">
        {errorMessage ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errorMessage}
          </Alert>
        ) : null}

        <Alert severity={emailSent ? "success" : "info"} sx={{ mb: 3 }}>
          {emailSent
            ? "該当するアカウントが存在する場合、認証コードをメールで送信しました。メールに記載された認証コードを入力してください。"
            : "登録済みのメールアドレスに認証コードを送信し、パスワードを再設定します。"}
        </Alert>

        <form action={requestPasswordReset}>
          <input type="hidden" name="redirectTo" value={redirectTo} />

          <div>
            <span className="text-neutral-600">メールアドレス</span>
            <TextField
              className="bg-white"
              fullWidth
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              defaultValue={email}
              required
              variant="outlined"
              size="small"
            />
          </div>

          <RequestCodeButton sent={emailSent} />
        </form>

        {email ? (
          <form
            action={confirmPasswordReset}
            className="mt-8 border-t border-slate-200 pt-6"
            onSubmit={() => {
              setHasSubmitted(true);
            }}
          >
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <input type="hidden" name="email" value={email} />

            <div className="mb-4 text-sm text-neutral-600">
              送信先メールアドレス: <span className="font-semibold text-slate-900">{email}</span>
            </div>

            <div>
              <span className="text-neutral-600">認証コード</span>
              <TextField
                fullWidth
                id="confirmationCode"
                name="confirmationCode"
                autoComplete="one-time-code"
                required
                variant="outlined"
                size="small"
                value={confirmationCode}
                onChange={(event) => setConfirmationCode(event.target.value)}
                error={hasSubmitted && isMissingConfirmationCode}
                sx={fieldSx}
                helperText={hasSubmitted && isMissingConfirmationCode ? "認証コードを入力してください" : "メールに記載された認証コードを入力してください"}
              />
            </div>

            <div className="mt-5">
              <span className="text-neutral-600">新しいパスワード</span>
              <PasswordTextField
                fullWidth
                id="newPassword"
                name="newPassword"
                autoComplete="new-password"
                required
                variant="outlined"
                size="small"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                error={hasSubmitted && (isMissingNewPassword || isPasswordInvalid)}
                sx={fieldSx}
                helperText={
                  hasSubmitted && isMissingNewPassword
                    ? "新しいパスワードを入力してください"
                    : hasSubmitted && isPasswordInvalid
                      ? `${COGNITO_PASSWORD_RULE_TEXT}で入力してください`
                      : `${COGNITO_PASSWORD_RULE_TEXT}で入力してください`
                }
                slotProps={{ htmlInput: { pattern: "[A-Za-z0-9]{8,}", minLength: 8 } }}
              />
            </div>

            <div className="mt-5">
              <span className="text-neutral-600">確認用パスワード</span>
              <PasswordTextField
                fullWidth
                id="confirmPassword"
                name="confirmPassword"
                autoComplete="new-password"
                required
                variant="outlined"
                size="small"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                error={hasSubmitted && (isMissingConfirmPassword || isPasswordMismatch)}
                sx={fieldSx}
                helperText={
                  hasSubmitted && isMissingConfirmPassword
                    ? "確認用パスワードを入力してください"
                    : hasSubmitted && isPasswordMismatch
                      ? "新しいパスワードと一致しません"
                      : "確認のため同じパスワードを再入力してください"
                }
              />
            </div>

            <ResetPasswordButton />
          </form>
        ) : null}

        <div className="mt-5 text-sm text-neutral-600">
          <Link href={loginHref as Route} className="font-semibold text-blue-700 underline-offset-2 hover:underline">
            ログイン画面に戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
