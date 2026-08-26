import type { MerchantCalendarView, UpdateMerchantCalendarRequest } from "../model/types";

async function parseError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
  return data?.message ?? data?.error ?? fallback;
}

export async function fetchCalendar(): Promise<MerchantCalendarView> {
  const res = await fetch("/api/calendar", { cache: "no-store" });

  if (!res.ok) {
    throw new Error(await parseError(res, "休業日カレンダーの取得に失敗しました。"));
  }

  return (await res.json()) as MerchantCalendarView;
}

export async function updateCalendar(body: UpdateMerchantCalendarRequest): Promise<MerchantCalendarView> {
  const res = await fetch("/api/calendar", {
    method: "PUT",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "休業日カレンダーの保存に失敗しました。"));
  }

  return (await res.json()) as MerchantCalendarView;
}
