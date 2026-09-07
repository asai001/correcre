import type { Mission, ScheduledMissionChange } from "@correcre/types";
import { describe, expect, test } from "vitest";

import { nextMonthYYYYMM, reflectMission, startOfYearMonthIso } from "./mission-schedule";

function createMission(overrides: Partial<Mission> = {}): Mission {
  return {
    companyId: "company-1",
    missionId: "mission-1",
    slotIndex: 1,
    version: 3,
    title: "現行タイトル",
    description: "現行説明",
    category: "現行カテゴリ",
    monthlyCount: 2,
    score: 50,
    enabled: true,
    fields: [{ key: "memo", label: "メモ", type: "text", required: false, order: 1 }],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

function createPendingChange(overrides: Partial<ScheduledMissionChange> = {}): ScheduledMissionChange {
  return {
    effectiveYearMonth: "2026-09",
    title: "予約タイトル",
    description: "予約説明",
    category: "予約カテゴリ",
    monthlyCount: 4,
    score: 80,
    enabled: false,
    fields: [],
    scheduledByUserId: "operator-1",
    scheduledAt: "2026-08-15T03:00:00.000Z",
    ...overrides,
  };
}

describe("nextMonthYYYYMM", () => {
  test("通常の翌月", () => {
    expect(nextMonthYYYYMM("2026-01")).toBe("2026-02");
    expect(nextMonthYYYYMM("2026-08")).toBe("2026-09");
  });

  test("12月の翌月は翌年1月", () => {
    expect(nextMonthYYYYMM("2026-12")).toBe("2027-01");
  });

  test("月は常に 2 桁ゼロ埋め", () => {
    expect(nextMonthYYYYMM("2026-09")).toBe("2026-10");
    expect(nextMonthYYYYMM("2026-10")).toBe("2026-11");
  });
});

describe("startOfYearMonthIso", () => {
  test("JST の月初 00:00 を UTC の ISO 文字列で返す", () => {
    expect(startOfYearMonthIso("2026-09")).toBe("2026-08-31T15:00:00.000Z");
    expect(startOfYearMonthIso("2027-01")).toBe("2026-12-31T15:00:00.000Z");
  });
});

describe("reflectMission", () => {
  test("反映予定月に達したら pendingChange を現行へ繰り入れ version を進める", () => {
    const pending = createPendingChange({ effectiveYearMonth: "2026-09" });
    const mission = createMission({ pendingChange: pending });

    const result = reflectMission(mission, "2026-09");

    expect(result.changed).toBe(true);
    expect(result.mission.pendingChange).toBeUndefined();
    expect(result.mission.version).toBe(4);
    expect(result.mission).toMatchObject({
      title: pending.title,
      description: pending.description,
      category: pending.category,
      monthlyCount: pending.monthlyCount,
      score: pending.score,
      enabled: pending.enabled,
      fields: pending.fields,
      updatedAt: startOfYearMonthIso("2026-09"),
    });
    // 識別子や作成日時は引き継ぐ
    expect(result.mission.companyId).toBe(mission.companyId);
    expect(result.mission.missionId).toBe(mission.missionId);
    expect(result.mission.slotIndex).toBe(mission.slotIndex);
    expect(result.mission.createdAt).toBe(mission.createdAt);
  });

  test("反映予定月を過ぎていても（読み取りが遅れても）繰り入れる", () => {
    const mission = createMission({ pendingChange: createPendingChange({ effectiveYearMonth: "2026-06" }) });

    const result = reflectMission(mission, "2026-09");

    expect(result.changed).toBe(true);
    expect(result.mission.updatedAt).toBe(startOfYearMonthIso("2026-06"));
  });

  test("反映予定月が未来ならそのまま返す", () => {
    const mission = createMission({ pendingChange: createPendingChange({ effectiveYearMonth: "2026-10" }) });

    const result = reflectMission(mission, "2026-09");

    expect(result.changed).toBe(false);
    expect(result.mission).toBe(mission);
  });

  test("pendingChange が無ければそのまま返す", () => {
    const mission = createMission();

    const result = reflectMission(mission, "2026-09");

    expect(result.changed).toBe(false);
    expect(result.mission).toBe(mission);
  });

  test("元のミッションオブジェクトは変更しない（純粋関数）", () => {
    const mission = createMission({ pendingChange: createPendingChange({ effectiveYearMonth: "2026-09" }) });
    const snapshot = structuredClone(mission);

    reflectMission(mission, "2026-09");

    expect(mission).toEqual(snapshot);
  });
});
