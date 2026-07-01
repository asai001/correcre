async function parseError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? fallback;
}

export async function sendInvoiceEmail(month: string): Promise<{ sentAt: string }> {
  const res = await fetch("/api/settlement/invoice", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ month }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "請求メールの送信に失敗しました。"));
  }

  return (await res.json()) as { sentAt: string };
}
