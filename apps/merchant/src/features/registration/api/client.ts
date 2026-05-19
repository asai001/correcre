import type {
  SubmitMerchantRegistrationInput,
  SubmitMerchantRegistrationResult,
} from "../model/types";

export async function submitRegistration(
  input: SubmitMerchantRegistrationInput,
): Promise<SubmitMerchantRegistrationResult> {
  const res = await fetch("/api/register", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "登録申請に失敗しました。");
  }

  return (await res.json()) as SubmitMerchantRegistrationResult;
}
