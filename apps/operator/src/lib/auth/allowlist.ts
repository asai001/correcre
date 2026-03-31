const OPERATOR_ALLOWED_EMAILS_ENV = "OPERATOR_ALLOWED_EMAILS";

export function normalizeOperatorEmail(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function getOperatorEmailAllowlist() {
  return new Set(
    (process.env[OPERATOR_ALLOWED_EMAILS_ENV] ?? "")
      .split(",")
      .map((value) => normalizeOperatorEmail(value))
      .filter(Boolean),
  );
}

export function isOperatorAllowlistConfigured() {
  return getOperatorEmailAllowlist().size > 0;
}

export function isOperatorEmailAllowed(email: string | undefined) {
  const allowlist = getOperatorEmailAllowlist();

  if (!allowlist.size) {
    return false;
  }

  const normalizedEmail = normalizeOperatorEmail(email);
  return !!normalizedEmail && allowlist.has(normalizedEmail);
}
