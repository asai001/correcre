export const LOGIN_ERROR_MESSAGES = {
  invalid_credentials: "ID またはパスワードが正しくありません。",
  missing_fields: "ID とパスワードを入力してください。",
  new_password_required: "初回ログインのため、Cognito 側でパスワード変更が必要です。",
  password_reset_required: "パスワード再設定が必要です。管理者にお問い合わせください。",
  rate_limited: "試行回数が多すぎます。しばらくしてから再度お試しください。",
  user_not_confirmed: "ユーザーが未確認です。管理者にお問い合わせください。",
  system_error: "ログインに失敗しました。設定値と Cognito の状態を確認してください。",
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
