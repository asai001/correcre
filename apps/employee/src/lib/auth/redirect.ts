import { EMPLOYEE_DEFAULT_REDIRECT_PATH } from "./constants";

export function pickFirstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function sanitizeRedirectTo(value: string | null | undefined): string {
  if (!value) {
    return EMPLOYEE_DEFAULT_REDIRECT_PATH;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return EMPLOYEE_DEFAULT_REDIRECT_PATH;
  }

  return value;
}
