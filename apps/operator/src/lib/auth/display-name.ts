import type { OperatorSession } from "./verify-token";

export function getOperatorDisplayName(session: OperatorSession) {
  const name = typeof session.payload.name === "string" ? session.payload.name.trim() : "";
  const email = typeof session.payload.email === "string" ? session.payload.email.trim() : "";

  return name || email || "運用者";
}
