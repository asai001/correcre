export const LOGIN_ERROR_MESSAGES = {
  invalid_credentials: "ID またはパスワードが正しくありません。",
  missing_fields: "ID とパスワードを入力してください。",
  new_password_required: "初回ログインのため、パスワード変更が必要です。",
  password_reset_required: "パスワードの再設定が必要です。再設定してからもう一度お試しください。",
  rate_limited: "試行回数が多すぎます。しばらく待ってから再度お試しください。",
  user_not_confirmed: "ユーザー確認が完了していません。登録状況を確認してください。",
  system_error: "ログインに失敗しました。設定内容とアカウント状態を確認してください。",
} as const;

export type LoginErrorCode = keyof typeof LOGIN_ERROR_MESSAGES;

export function getLoginErrorMessage(code: string | undefined): string | undefined {
  if (!code) {
    return undefined;
  }

  return LOGIN_ERROR_MESSAGES[code as LoginErrorCode] ?? LOGIN_ERROR_MESSAGES.system_error;
}

export function mapAuthenticationErrorToCode(error: unknown): LoginErrorCode {
  const name = error instanceof Error ? error.name : undefined;

  switch (name) {
    case "NotAuthorizedException":
    case "UserNotFoundException":
      return "invalid_credentials";
    case "PasswordResetRequiredException":
      return "password_reset_required";
    case "TooManyRequestsException":
      return "rate_limited";
    case "UserNotConfirmedException":
      return "user_not_confirmed";
    case "NewPasswordRequired":
      return "new_password_required";
    default:
      return "system_error";
  }
}
