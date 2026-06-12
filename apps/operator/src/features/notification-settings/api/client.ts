import type { NotificationSettingsData } from "../model/types";

async function parseError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? fallback;
}

export async function saveNotificationSettings(
  operatorNotificationEmails: readonly string[],
): Promise<NotificationSettingsData> {
  const res = await fetch("/api/settings/notification", {
    method: "PUT",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operatorNotificationEmails }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "通知設定の保存に失敗しました。"));
  }

  return (await res.json()) as NotificationSettingsData;
}
