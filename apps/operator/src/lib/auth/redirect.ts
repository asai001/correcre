import { OPERATOR_CLEAR_SESSION_PATH, OPERATOR_DEFAULT_REDIRECT_PATH } from "./constants";

export function pickFirstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function sanitizeRedirectTo(value: string | null | undefined): string {
  if (!value) {
    return OPERATOR_DEFAULT_REDIRECT_PATH;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return OPERATOR_DEFAULT_REDIRECT_PATH;
  }

  return value;
}

export function buildClearOperatorSessionRedirect(redirectTo?: string | null): string {
  const sanitizedRedirectTo = sanitizeRedirectTo(redirectTo);

  if (sanitizedRedirectTo === OPERATOR_DEFAULT_REDIRECT_PATH) {
    return OPERATOR_CLEAR_SESSION_PATH;
  }

  const params = new URLSearchParams({ from: sanitizedRedirectTo });
  return `${OPERATOR_CLEAR_SESSION_PATH}?${params.toString()}`;
}
