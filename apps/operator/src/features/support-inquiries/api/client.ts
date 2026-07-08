import type { SupportInquiryStatus } from "@correcre/types";

import type { UpdateSupportInquiryStatusResult } from "../model/types";

async function parseError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? fallback;
}

export async function saveSupportInquiryStatus(
  inquiryId: string,
  status: SupportInquiryStatus,
): Promise<UpdateSupportInquiryStatusResult> {
  const res = await fetch(`/api/support-inquiries/${encodeURIComponent(inquiryId)}/status`, {
    method: "PUT",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "問い合わせの対応状況を更新できませんでした。"));
  }

  return (await res.json()) as UpdateSupportInquiryStatusResult;
}
