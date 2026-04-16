import type { CreateCompanyInput, OperatorCompanySummary, UpdateCompanyInput } from "../model/types";

export async function createCompany(input: CreateCompanyInput): Promise<OperatorCompanySummary> {
  const res = await fetch("/api/companies", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "企業の登録に失敗しました。");
  }

  return (await res.json()) as OperatorCompanySummary;
}

export async function updateCompany(input: UpdateCompanyInput): Promise<OperatorCompanySummary> {
  const res = await fetch("/api/companies", {
    method: "PATCH",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "企業情報の更新に失敗しました。");
  }

  return (await res.json()) as OperatorCompanySummary;
}
