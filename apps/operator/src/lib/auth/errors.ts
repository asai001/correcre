export const LOGIN_ERROR_MESSAGES = {
  invalid_credentials: "メールアドレスまたはパスワードが正しくありません。",
  missing_fields: "必須項目を入力してください。",
  new_password_session_expired:
    "パスワード設定の有効期限が切れました。もう一度ログインして設定し直してください。",
  invalid_new_password: "新しいパスワードが条件を満たしていません。内容を確認して再入力してください。",
  password_confirmation_mismatch: "新しいパスワードと確認用パスワードが一致しません。",
  password_reset_required: "パスワードの再設定が必要です。設定を完了してからもう一度ログインしてください。",
  rate_limited: "試行回数が上限に達しました。しばらく待ってから再度お試しください。",
  user_not_confirmed: "アカウントの確認が完了していません。設定を確認してください。",
  operator_email_not_allowed: "このメールアドレスでは運用者画面にログインできません。",
  operator_allowlist_not_configured: "運用者画面の利用設定が未完了です。管理者に連絡してください。",
  system_error: "ログイン処理に失敗しました。設定内容とアカウント情報を確認してください。",
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
