import type {
  CreateMerchantInput,
  CreateMerchantUserInput,
  MerchantApplicationDecisionInput,
  MerchantSummary,
  MerchantUserSummary,
  ResetMerchantUserEmailInput,
  ResetMerchantUserPasswordInput,
  UpdateMerchantInput,
} from "../model/types";

export async function fetchMerchants(): Promise<MerchantSummary[]> {
  const res = await fetch("/api/merchants", { cache: "no-store" });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "提携企業の取得に失敗しました。");
  }

  return (await res.json()) as MerchantSummary[];
}

export async function createMerchant(input: CreateMerchantInput): Promise<MerchantSummary> {
  const res = await fetch("/api/merchants", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "提携企業の登録に失敗しました。");
  }

  return (await res.json()) as MerchantSummary;
}

export async function updateMerchant(input: UpdateMerchantInput): Promise<MerchantSummary> {
  const res = await fetch("/api/merchants", {
    method: "PATCH",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "提携企業の更新に失敗しました。");
  }

  return (await res.json()) as MerchantSummary;
}

export async function fetchMerchantUsers(merchantId: string): Promise<MerchantUserSummary[]> {
  const res = await fetch(`/api/merchants/${encodeURIComponent(merchantId)}/users`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "提携企業ユーザーの取得に失敗しました。");
  }

  return (await res.json()) as MerchantUserSummary[];
}

export async function inviteMerchantUser(input: CreateMerchantUserInput): Promise<MerchantUserSummary> {
  const res = await fetch(`/api/merchants/${encodeURIComponent(input.merchantId)}/users`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "提携企業ユーザーの招待に失敗しました。");
  }

  return (await res.json()) as MerchantUserSummary;
}

export async function resetMerchantUserEmail(input: ResetMerchantUserEmailInput): Promise<MerchantUserSummary> {
  const res = await fetch(
    `/api/merchants/${encodeURIComponent(input.merchantId)}/users/${encodeURIComponent(input.userId)}/email`,
    {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail: input.newEmail }),
    },
  );

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "メールアドレスのリセットに失敗しました。");
  }

  return (await res.json()) as MerchantUserSummary;
}

export async function resetMerchantUserPassword(
  input: ResetMerchantUserPasswordInput,
): Promise<MerchantUserSummary> {
  const res = await fetch(
    `/api/merchants/${encodeURIComponent(input.merchantId)}/users/${encodeURIComponent(input.userId)}/password`,
    {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    },
  );

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "パスワードリセットに失敗しました。");
  }

  return (await res.json()) as MerchantUserSummary;
}

export async function approveMerchantApplication(
  input: MerchantApplicationDecisionInput,
): Promise<MerchantSummary> {
  const res = await fetch(`/api/merchants/${encodeURIComponent(input.merchantId)}/approve`, {
    method: "POST",
    cache: "no-store",
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "提携企業の承認に失敗しました。");
  }

  return (await res.json()) as MerchantSummary;
}

export async function rejectMerchantApplication(
  input: MerchantApplicationDecisionInput,
): Promise<MerchantSummary> {
  const res = await fetch(`/api/merchants/${encodeURIComponent(input.merchantId)}/reject`, {
    method: "POST",
    cache: "no-store",
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "提携企業の却下に失敗しました。");
  }

  return (await res.json()) as MerchantSummary;
}
