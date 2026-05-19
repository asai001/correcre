import type { OperatorMissionHistoryItem, OperatorMissionSummary, UpdateMissionInput } from "../model/types";

export async function fetchMissions(companyId: string): Promise<OperatorMissionSummary[]> {
  const res = await fetch(`/api/missions?companyId=${encodeURIComponent(companyId)}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "ミッション一覧の取得に失敗しました。");
  }

  return (await res.json()) as OperatorMissionSummary[];
}

export async function updateMission(
  companyId: string,
  slotIndex: number,
  input: UpdateMissionInput,
): Promise<OperatorMissionSummary> {
  const res = await fetch(`/api/missions/${slotIndex}?companyId=${encodeURIComponent(companyId)}`, {
    method: "PUT",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "ミッションの更新に失敗しました。");
  }

  return (await res.json()) as OperatorMissionSummary;
}

export async function fetchMissionHistory(
  companyId: string,
  slotIndex: number,
): Promise<OperatorMissionHistoryItem[]> {
  const res = await fetch(
    `/api/missions/${slotIndex}/history?companyId=${encodeURIComponent(companyId)}`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "ミッション履歴の取得に失敗しました。");
  }

  return (await res.json()) as OperatorMissionHistoryItem[];
}
