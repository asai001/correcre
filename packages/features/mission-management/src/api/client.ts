import type { MissionApplyMode, MissionHistoryItem, MissionSlotSummary, UpdateMissionInput } from "../model/types";

export const DEFAULT_MISSION_API_BASE_PATH = "/api/missions";

export type MissionApiClientOptions = {
  // ミッション API のベースパス。既定は "/api/missions"。
  basePath?: string;
  // 対象企業をクエリで指定するアプリ（運用者）だけが渡す。
  // 管理者アプリはサーバー側でセッションの企業に固定するため渡さない（渡しても無視される）。
  companyId?: string;
};

export type MissionApiClient = {
  fetchMissions: () => Promise<MissionSlotSummary[]>;
  updateMission: (
    slotIndex: number,
    input: UpdateMissionInput,
    applyMode?: MissionApplyMode,
  ) => Promise<MissionSlotSummary>;
  // 「翌月月初から反映」予約を取り消す。
  cancelScheduledChange: (slotIndex: number) => Promise<MissionSlotSummary>;
  fetchMissionHistory: (slotIndex: number) => Promise<MissionHistoryItem[]>;
};

async function readErrorMessage(res: Response, fallback: string) {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? fallback;
}

// アプリごとの API の置き場所・企業の指定方法の違いを吸収したクライアントを作る。
export function createMissionApiClient(options: MissionApiClientOptions = {}): MissionApiClient {
  const basePath = (options.basePath ?? DEFAULT_MISSION_API_BASE_PATH).replace(/\/+$/, "");
  const query = options.companyId ? `?companyId=${encodeURIComponent(options.companyId)}` : "";

  const buildUrl = (path = "") => `${basePath}${path}${query}`;

  return {
    async fetchMissions() {
      const res = await fetch(buildUrl(), { cache: "no-store" });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "ミッション一覧の取得に失敗しました。"));
      }

      return (await res.json()) as MissionSlotSummary[];
    },

    async updateMission(slotIndex, input, applyMode = "immediate") {
      const res = await fetch(buildUrl(`/${slotIndex}`), {
        method: "PUT",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, applyMode }),
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "ミッションの更新に失敗しました。"));
      }

      return (await res.json()) as MissionSlotSummary;
    },

    async cancelScheduledChange(slotIndex) {
      const res = await fetch(buildUrl(`/${slotIndex}/scheduled`), {
        method: "DELETE",
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "予約の取り消しに失敗しました。"));
      }

      return (await res.json()) as MissionSlotSummary;
    },

    async fetchMissionHistory(slotIndex) {
      const res = await fetch(buildUrl(`/${slotIndex}/history`), { cache: "no-store" });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "ミッション履歴の取得に失敗しました。"));
      }

      return (await res.json()) as MissionHistoryItem[];
    },
  };
}
