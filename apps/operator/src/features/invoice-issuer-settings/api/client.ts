import type { InvoiceIssuer } from "@correcre/lib/company-invoice";

import type { InvoiceIssuerSettingsData } from "../model/types";

export async function saveInvoiceIssuerSettings(issuer: InvoiceIssuer): Promise<InvoiceIssuerSettingsData> {
  const res = await fetch("/api/settings/invoice-issuer", {
    method: "PUT",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(issuer),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "請求書の発行元情報の保存に失敗しました。");
  }

  return (await res.json()) as InvoiceIssuerSettingsData;
}
