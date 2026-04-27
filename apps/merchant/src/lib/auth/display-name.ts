import type { MerchantSession } from "./verify-token";

export function getMerchantDisplayName(session: MerchantSession) {
  const name = typeof session.payload.name === "string" ? session.payload.name.trim() : "";
  const email = typeof session.payload.email === "string" ? session.payload.email.trim() : "";

  return name || email || "提携企業";
}
