export const LOGIN_ERROR_MESSAGES = {
  invalid_credentials: "ID またはパスワードが正しくありません。",
  missing_fields: "必要項目を入力してください。",
  missing_email: "メールアドレスを入力してください。",
  missing_reset_fields: "認証コードと新しいパスワードを入力してください。",
  new_password_session_expired: "パスワード設定のセッションが失効しました。もう一度ログインしてください。",
  invalid_new_password: "新しいパスワードが条件を満たしていません。半角英数字8文字以上で入力してください。",
  password_confirmation_mismatch: "新しいパスワードと確認用パスワードが一致しません。",
  password_reset_required: "パスワードの再設定が必要です。再設定してからもう一度お試しください。",
  invalid_verification_code: "認証コードが正しくありません。",
  expired_verification_code: "認証コードの有効期限が切れました。もう一度認証コードを送信してください。",
  rate_limited: "試行回数が多すぎます。しばらく待ってから再度お試しください。",
  user_not_confirmed: "ユーザー確認が完了していません。管理状態を確認してください。",
  admin_role_not_allowed: "管理者権限がないため、ログインできません。",
  system_error: "ログイン処理に失敗しました。設定内容とアカウント状態を確認してください。",
} as const;

export const LOGIN_NOTICE_MESSAGES = {
  password_reset_success: "パスワードを再設定しました。新しいパスワードでログインしてください。",
} as const;

export type LoginErrorCode = keyof typeof LOGIN_ERROR_MESSAGES;
export type LoginNoticeCode = keyof typeof LOGIN_NOTICE_MESSAGES;

export function getLoginErrorMessage(code: string | undefined): string | undefined {
  if (!code) {
    return undefined;
  }

  return LOGIN_ERROR_MESSAGES[code as LoginErrorCode] ?? LOGIN_ERROR_MESSAGES.system_error;
}

export function getLoginNoticeMessage(code: string | undefined): string | undefined {
  if (!code) {
    return undefined;
  }

  return LOGIN_NOTICE_MESSAGES[code as LoginNoticeCode];
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

export function mapForgotPasswordRequestErrorToCode(error: unknown): LoginErrorCode {
  const name = error instanceof Error ? error.name : undefined;

  switch (name) {
    case "TooManyRequestsException":
    case "LimitExceededException":
      return "rate_limited";
    case "UserNotConfirmedException":
      return "user_not_confirmed";
    default:
      return "system_error";
  }
}

export function mapForgotPasswordConfirmErrorToCode(error: unknown): LoginErrorCode {
  const name = error instanceof Error ? error.name : undefined;

  switch (name) {
    case "CodeMismatchException":
      return "invalid_verification_code";
    case "ExpiredCodeException":
      return "expired_verification_code";
    case "InvalidPasswordException":
      return "invalid_new_password";
    case "TooManyRequestsException":
    case "LimitExceededException":
      return "rate_limited";
    default:
      return "system_error";
  }
}
