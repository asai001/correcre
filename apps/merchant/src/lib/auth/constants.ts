export const MERCHANT_SESSION_COOKIE_NAME = "correcre_merchant_session";
export const MERCHANT_NEW_PASSWORD_CHALLENGE_COOKIE_NAME = "correcre_merchant_new_password_challenge";
export const MERCHANT_LOGIN_NOTICE_COOKIE_NAME = "correcre_merchant_login_notice";
export const MERCHANT_LOGIN_PATH = "/login";
export const MERCHANT_NEW_PASSWORD_PATH = "/login/new-password";
export const MERCHANT_FORGOT_PASSWORD_PATH = "/login/forgot-password";
export const MERCHANT_DEFAULT_REDIRECT_PATH = "/dashboard";

export const MERCHANT_PROTECTED_PATH_PREFIXES = [
  "/dashboard",
  "/merchandise",
  "/exchanges",
] as const;
