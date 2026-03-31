export const OPERATOR_SESSION_COOKIE_NAME = "correcre_operator_session";
export const OPERATOR_NEW_PASSWORD_CHALLENGE_COOKIE_NAME = "correcre_operator_new_password_challenge";
export const OPERATOR_LOGIN_PATH = "/login";
export const OPERATOR_NEW_PASSWORD_PATH = "/login/new-password";
export const OPERATOR_DEFAULT_REDIRECT_PATH = "/dashboard";

export const OPERATOR_PROTECTED_PATH_PREFIXES = [
  "/dashboard",
  "/company-registration",
  "/user-registration",
] as const;
