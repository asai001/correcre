import { ADMIN_CLEAR_SESSION_PATH, ADMIN_DEFAULT_REDIRECT_PATH } from "./constants";

export function pickFirstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function sanitizeRedirectTo(value: string | null | undefined): string {
  if (!value) {
    return ADMIN_DEFAULT_REDIRECT_PATH;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return ADMIN_DEFAULT_REDIRECT_PATH;
  }

  return value;
}

// ログインできなくなったセッション（ユーザーが削除済み・所属企業が無効化済みなど）を消してログイン画面へ戻すための URL。
// Server Component では Cookie を変更できないため、Route Handler（/api/auth/clear-session）に任せる。
export function buildClearAdminSessionRedirect(redirectTo?: string | null): string {
  const sanitizedRedirectTo = sanitizeRedirectTo(redirectTo);

  if (sanitizedRedirectTo === ADMIN_DEFAULT_REDIRECT_PATH) {
    return ADMIN_CLEAR_SESSION_PATH;
  }

  const params = new URLSearchParams({ from: sanitizedRedirectTo });
  return `${ADMIN_CLEAR_SESSION_PATH}?${params.toString()}`;
}
