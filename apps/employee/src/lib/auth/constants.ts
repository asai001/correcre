export const EMPLOYEE_SESSION_COOKIE_NAME = "correcre_employee_session";
export const EMPLOYEE_NEW_PASSWORD_CHALLENGE_COOKIE_NAME = "correcre_employee_new_password_challenge";
export const EMPLOYEE_LOGIN_NOTICE_COOKIE_NAME = "correcre_employee_login_notice";
export const EMPLOYEE_LOGIN_PATH = "/login";
export const EMPLOYEE_NEW_PASSWORD_PATH = "/login/new-password";
export const EMPLOYEE_FORGOT_PASSWORD_PATH = "/login/forgot-password";
export const EMPLOYEE_DEFAULT_REDIRECT_PATH = "/dashboard";

export const EMPLOYEE_PROTECTED_PATH_PREFIXES = [
  "/dashboard",
  "/past-performance",
] as const;
