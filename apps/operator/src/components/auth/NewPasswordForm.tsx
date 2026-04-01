"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { Alert, Button, TextField } from "@mui/material";

import { completeNewPassword } from "@operator/app/lib/actions/authenticate";
import { OPERATOR_DEFAULT_REDIRECT_PATH } from "@operator/lib/auth/constants";
import { COGNITO_PASSWORD_RULE_TEXT, isValidCognitoPassword } from "@correcre/lib/auth/password";

type NewPasswordFormProps = {
  email: string;
  errorMessage?: string;
  redirectTo?: string;
};

const passwordFieldSx = {
  "& .MuiOutlinedInput-root": {
    backgroundColor: "#ffffff",
  },
  "& .MuiFormHelperText-root": {
    marginLeft: 0,
    marginRight: 0,
    backgroundColor: "transparent",
  },
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="contained" color="primary" fullWidth disabled={pending} sx={{ my: 4, py: 1.5 }}>
      {pending ? "更新中..." : "新しいパスワードを設定"}
    </Button>
  );
}

export default function NewPasswordForm({
  email,
  errorMessage,
  redirectTo = OPERATOR_DEFAULT_REDIRECT_PATH,
}: NewPasswordFormProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const isMissingNewPassword = !newPassword.trim();
  const isMissingConfirmPassword = !confirmPassword.trim();
  const isPasswordInvalid = !!newPassword && !isValidCognitoPassword(newPassword);
  const isPasswordMismatch = !!newPassword && !!confirmPassword && newPassword !== confirmPassword;

  return (
    <div className="w-full rounded bg-[#D8FAFF]/40 pt-15">
      <div className="mx-auto w-4/5 pb-8">
        <form
          action={completeNewPassword}
          onSubmit={() => {
            setHasSubmitted(true);
          }}
        >
          <input type="hidden" name="redirectTo" value={redirectTo} />

          {errorMessage ? (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errorMessage}
            </Alert>
          ) : null}

          <Alert severity="info" sx={{ mb: 3 }}>
            初回ログインのため、新しいパスワードを設定してください。
            <br />
            対象アカウント: {email}
          </Alert>

          <div>
            <span className="text-neutral-600">新しいパスワード</span>
            <TextField
              fullWidth
              id="newPassword"
              type="password"
              name="newPassword"
              autoComplete="new-password"
              required
              variant="outlined"
              size="small"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              error={hasSubmitted && (isMissingNewPassword || isPasswordInvalid)}
              sx={passwordFieldSx}
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
            <TextField
              fullWidth
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              required
              variant="outlined"
              size="small"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              error={hasSubmitted && (isMissingConfirmPassword || isPasswordMismatch)}
              sx={passwordFieldSx}
              helperText={
                hasSubmitted && isMissingConfirmPassword
                  ? "確認用パスワードを入力してください"
                  : hasSubmitted && isPasswordMismatch
                    ? "新しいパスワードと一致しません"
                    : "確認のため同じパスワードを再入力してください"
              }
            />
          </div>

          <p className="mt-4 text-sm text-neutral-600">
            変更後はそのままユーザー登録画面へログインします。条件に合わない場合は再入力してください。
          </p>

          <SubmitButton />
        </form>
      </div>
    </div>
  );
}
