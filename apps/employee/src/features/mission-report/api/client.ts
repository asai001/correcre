import { FORM_CONFIGS } from "../model/form-configs.mock";
import { MISSION_PLAN, MISSION_PROGRESS_BY_USER } from "../model/mission-catalog.mock";
import type { FormConfig, MissionPlan, MissionProgress } from "../model/types";

// 将来 DynamoDB/API に置換する関数群（今はモック返却）

export async function fetchMissionFormConfig(companyId: string, missionId: string): Promise<FormConfig | null> {
  console.log(companyId, missionId);
  await new Promise((r) => setTimeout(r, 20));
  //   return FORM_CONFIGS[companyId]?.[missionId] ?? null;
  return FORM_CONFIGS.find((c) => c.companyId === companyId && c.missionId === missionId && c.isPublished) ?? null;
}

export async function fetchMissionPlan(companyId: string): Promise<MissionPlan | null> {
  await new Promise((r) => setTimeout(r, 20));
  return MISSION_PLAN[companyId] ?? null;
}

export async function fetchMissionProgress(companyId: string, userId: string, period: string): Promise<MissionProgress[]> {
  await new Promise((r) => setTimeout(r, 20));
  const response = MISSION_PROGRESS_BY_USER.filter((p) => p.companyId === companyId && p.userId === userId && p.period === period);
  console.log("fetchMissionProgressResponse", response);
  return response;
}
