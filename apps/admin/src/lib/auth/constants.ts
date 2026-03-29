export const ADMIN_SESSION_COOKIE_NAME = "correcre_admin_session";
export const ADMIN_LOGIN_PATH = "/login";
export const ADMIN_DEFAULT_REDIRECT_PATH = "/dashboard";

export const ADMIN_PROTECTED_PATH_PREFIXES = [
  "/dashboard",
  "/analysis-report",
  "/employee-management",
] as const;
