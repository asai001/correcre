export const LOGIN_ERROR_MESSAGES = {
  invalid_credentials: "メールアドレスまたはパスワードが正しくありません。",
  missing_fields: "メールアドレスとパスワードを入力してください。",
  new_password_session_expired:
    "新しいパスワードの設定セッションの有効期限が切れました。もう一度ログインして設定をやり直してください。",
  invalid_new_password:
    "新しいパスワードが要件を満たしていません。英大文字・英小文字・数字・記号を含めて入力してください。",
  password_confirmation_mismatch: "新しいパスワードと確認用パスワードが一致しません。",
  password_reset_required:
    "パスワードの再設定が必要です。管理者に連絡してからもう一度ログインしてください。",
  rate_limited: "試行回数が多すぎます。しばらく待ってから再度お試しください。",
  user_not_confirmed: "アカウントの確認が完了していません。管理者に確認してください。",
  operator_role_not_allowed:
    "User テーブルで OPERATOR ロールが付与されたユーザーのみ運用者画面にログインできます。",
  system_error: "ログイン処理に失敗しました。設定情報とアカウント情報を確認してください。",
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
    default:
      return "system_error";
  }
}

export function mapNewPasswordErrorToCode(error: unknown): LoginErrorCode {
  const name = error instanceof Error ? error.name : undefined;

  switch (name) {
    case "InvalidPasswordException":
    case "InvalidParameterException":
      return "invalid_new_password";
    case "NewPasswordChallengeExpired":
    case "NotAuthorizedException":
    case "ExpiredCodeException":
      return "new_password_session_expired";
    case "TooManyRequestsException":
      return "rate_limited";
    default:
      return "system_error";
  }
}
