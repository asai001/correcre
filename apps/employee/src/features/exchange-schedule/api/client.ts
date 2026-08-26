import type {
  EmployeeScheduleView,
  RequestDateRequest,
  SelectCandidateRequest,
} from "../model/types";

// 「選択された日は受付を終了しました」— 最新の候補ビューを添えて画面を再描画できるようにする
export class CandidateExpiredError extends Error {
  constructor(
    message: string,
    public readonly latest?: EmployeeScheduleView,
  ) {
    super(message);
    this.name = "CandidateExpiredError";
  }
}

async function parseError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
  return data?.message ?? data?.error ?? fallback;
}

export async function fetchSchedule(exchangeId: string): Promise<EmployeeScheduleView> {
  const res = await fetch(`/api/exchange-schedule/${encodeURIComponent(exchangeId)}`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(await parseError(res, "お届け日情報の取得に失敗しました。"));
  }

  return (await res.json()) as EmployeeScheduleView;
}

export async function selectCandidate(
  exchangeId: string,
  body: SelectCandidateRequest,
): Promise<EmployeeScheduleView> {
  const res = await fetch(`/api/exchange-schedule/${encodeURIComponent(exchangeId)}/select`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as
      | { error?: string; message?: string; latest?: EmployeeScheduleView }
      | null;

    if (data?.error === "candidate_expired") {
      throw new CandidateExpiredError(
        data.message ?? "選択された日は受付を終了しました。最新の候補からお選びください。",
        data.latest,
      );
    }

    throw new Error(data?.message ?? data?.error ?? "お届け日の確定に失敗しました。");
  }

  return (await res.json()) as EmployeeScheduleView;
}

export async function requestDate(
  exchangeId: string,
  body: RequestDateRequest,
): Promise<EmployeeScheduleView> {
  const res = await fetch(`/api/exchange-schedule/${encodeURIComponent(exchangeId)}/request-date`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "希望日の送信に失敗しました。"));
  }

  return (await res.json()) as EmployeeScheduleView;
}

export async function cancelSchedule(exchangeId: string, reason?: string): Promise<EmployeeScheduleView> {
  const res = await fetch(`/api/exchange-schedule/${encodeURIComponent(exchangeId)}/cancel`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "キャンセルに失敗しました。"));
  }

  return (await res.json()) as EmployeeScheduleView;
}
