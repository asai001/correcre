import type { SubmitSupportInquiryInput, SubmitSupportInquiryResult } from "../model/types";

async function parseError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? fallback;
}

export async function submitSupportInquiry(input: SubmitSupportInquiryInput): Promise<SubmitSupportInquiryResult> {
  const res = await fetch("/api/support-inquiries", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "問い合わせの送信に失敗しました。時間をおいて再度お試しください。"));
  }

  return (await res.json()) as SubmitSupportInquiryResult;
}
