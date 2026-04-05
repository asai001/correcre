export const ADMIN_SESSION_COOKIE_NAME = "correcre_admin_session";
export const ADMIN_NEW_PASSWORD_CHALLENGE_COOKIE_NAME = "correcre_admin_new_password_challenge";
export const ADMIN_LOGIN_NOTICE_COOKIE_NAME = "correcre_admin_login_notice";
export const ADMIN_LOGIN_PATH = "/login";
export const ADMIN_NEW_PASSWORD_PATH = "/login/new-password";
export const ADMIN_FORGOT_PASSWORD_PATH = "/login/forgot-password";
export const ADMIN_DEFAULT_REDIRECT_PATH = "/dashboard";

export const ADMIN_PROTECTED_PATH_PREFIXES = [
  "/dashboard",
  "/analysis-report",
  "/employee-management",
] as const;
