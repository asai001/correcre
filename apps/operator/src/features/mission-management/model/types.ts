import type { Mission, MissionField, MissionHistory } from "@correcre/types";

export const MISSION_SLOT_COUNT = 5;

// 有効な全ミッションの「月間実施回数 × 点数」の合計の上限（点）。
export const MISSION_TOTAL_POINTS_CAP = 100;

// API レスポンス用のミッションサマリー
export type OperatorMissionSummary = {
  missionId: string | null;
  slotIndex: number;
  version: number;
  title: string;
  description: string;
  category: string;
  monthlyCount: number;
  score: number;
  enabled: boolean;
  fields: MissionField[];
  updatedAt: string | null;
  configured: boolean;
};

// ミッション編集 API の入力
export type UpdateMissionInput = {
  title: string;
  description: string;
  category: string;
  monthlyCount: number;
  score: number;
  enabled: boolean;
  fields: MissionField[];
};

// ミッション履歴のレスポンス
export type OperatorMissionHistoryItem = {
  version: number;
  title: string;
  description: string;
  category: string;
  monthlyCount: number;
  score: number;
  fields: MissionField[];
  validFrom: string;
  validTo: string | null;
  changedByUserId: string;
  createdAt: string;
};

export function createEmptyMissionSummary(slotIndex: number): OperatorMissionSummary {
  return {
    missionId: null,
    slotIndex,
    version: 0,
    title: "",
    description: "",
    category: "",
    monthlyCount: 1,
    score: 1,
    enabled: true,
    fields: [],
    updatedAt: null,
    configured: false,
  };
}

export function toMissionSummary(mission: Mission): OperatorMissionSummary {
  return {
    missionId: mission.missionId,
    slotIndex: mission.slotIndex,
    version: mission.version,
    title: mission.title,
    description: mission.description,
    category: mission.category,
    monthlyCount: mission.monthlyCount,
    score: mission.score,
    enabled: mission.enabled,
    fields: mission.fields,
    updatedAt: mission.updatedAt,
    configured: true,
  };
}

export function toHistoryItem(history: MissionHistory): OperatorMissionHistoryItem {
  return {
    version: history.version,
    title: history.title,
    description: history.description,
    category: history.category,
    monthlyCount: history.monthlyCount,
    score: history.score,
    fields: history.fields,
    validFrom: history.validFrom,
    validTo: history.validTo,
    changedByUserId: history.changedByUserId,
    createdAt: history.createdAt,
  };
}
