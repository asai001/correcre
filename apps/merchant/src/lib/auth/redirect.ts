import { MERCHANT_DEFAULT_REDIRECT_PATH } from "./constants";

export function pickFirstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function sanitizeRedirectTo(value: string | null | undefined): string {
  if (!value) {
    return MERCHANT_DEFAULT_REDIRECT_PATH;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return MERCHANT_DEFAULT_REDIRECT_PATH;
  }

  return value;
}
