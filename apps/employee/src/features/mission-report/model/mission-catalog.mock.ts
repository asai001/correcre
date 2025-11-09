// apps/employee/src/features/mission-report/model/mission-catalog.mock.ts
import type { MissionPlan, MissionProgress } from "./types";

export const MISSION_PLAN: Record<string, MissionPlan> = {
  "em-inc": {
    companyId: "em-inc",
    version: 5,
    isPublished: true,
    items: [
      {
        missionId: "greetings",
        title: "挨拶運動",
        desc: "朝礼に参加する",
        maxScore: 20,
        order: 10,
        enabled: true,
      },
      {
        missionId: "health",
        title: "健康推進活動",
        desc: "健康維持向上のための活動",
        maxScore: 20,
        order: 20,
        enabled: true,
      },
      {
        missionId: "growth",
        title: "自己研鑽・成長",
        desc: "新しいスキルや知識を習得する",
        maxScore: 5,
        order: 30,
        enabled: true,
      },
      {
        missionId: "improve",
        title: "効率化・改善提案",
        desc: "業務プロセスの改善案を提案",
        maxScore: 5,
        order: 40,
        enabled: true,
      },
      {
        missionId: "community",
        title: "地域活動",
        desc: "地域のイベントへの参加",
        maxScore: 1,
        order: 50,
        enabled: true,
      },
    ],
  },
};

// ユーザー進捗（とりあえずモック）
export const MISSION_PROGRESS_BY_USER: MissionProgress[] = [
  { companyId: "em-inc", userId: "user-001", period: "2025-10", missionId: "greetings", current: 18, updatedAt: "2025-10-25 11:00:00" },
  { companyId: "em-inc", userId: "user-001", period: "2025-10", missionId: "health", current: 8, updatedAt: "2025-10-25 11:00:00" },
  { companyId: "em-inc", userId: "user-001", period: "2025-10", missionId: "growth", current: 5, updatedAt: "2025-10-25 11:00:00" },
  { companyId: "em-inc", userId: "user-001", period: "2025-10", missionId: "improve", current: 1, updatedAt: "2025-10-25 11:00:00" },
  { companyId: "em-inc", userId: "user-001", period: "2025-10", missionId: "community", current: 1, updatedAt: "2025-10-25 11:00:00" },

  { companyId: "em-inc", userId: "user-001", period: "2025-11", missionId: "greetings", current: 18, updatedAt: "2025-10-25 11:00:00" },
  { companyId: "em-inc", userId: "user-001", period: "2025-11", missionId: "health", current: 8, updatedAt: "2025-10-25 11:00:00" },
  { companyId: "em-inc", userId: "user-001", period: "2025-11", missionId: "growth", current: 5, updatedAt: "2025-10-25 11:00:00" },
  { companyId: "em-inc", userId: "user-001", period: "2025-11", missionId: "improve", current: 1, updatedAt: "2025-10-25 11:00:00" },
  { companyId: "em-inc", userId: "user-001", period: "2025-11", missionId: "community", current: 1, updatedAt: "2025-10-25 11:00:00" },
];
