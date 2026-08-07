import type { SubmitSeminarRegistrationInput, SubmitSeminarRegistrationResult } from "../model/types";

const FAILED_MESSAGE = "お申し込みの送信に失敗しました。時間をおいて再度お試しください。";

export async function submitSeminarRegistration(
  input: SubmitSeminarRegistrationInput,
): Promise<SubmitSeminarRegistrationResult> {
  const res = await fetch("/api/seminar-registrations", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? FAILED_MESSAGE);
  }

  return (await res.json()) as SubmitSeminarRegistrationResult;
}
