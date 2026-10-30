import type { TransactWriteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { Mission } from "@correcre/types";

const sendMock = jest.fn();

jest.mock("@correcre/lib/dynamodb/client", () => ({
  getDynamoDocumentClient: jest.fn(() => ({ send: sendMock })),
}));
jest.mock("@correcre/lib/dynamodb/mission", () => ({
  buildMissionSk: (slotIndex: number) => `MISSION#${slotIndex}`,
  listMissionsByCompany: jest.fn(),
  getMissionBySlot: jest.fn(),
  promoteScheduledMissionIfDue: jest.fn(),
}));
jest.mock("@correcre/lib/dynamodb/mission-history", () => ({
  buildMissionHistoryPk: (companyId: string, missionId: string) => `COMPANY#${companyId}#MISSION#${missionId}`,
  buildMissionHistorySk: (version: number) => `VER#${version}`,
  listMissionHistory: jest.fn(),
}));
jest.mock("@correcre/lib/env/server", () => ({
  readRequiredServerEnv: jest.fn((name: string) => `test-${name}`),
}));

import { nextMonthYYYYMM, nowYYYYMM } from "@correcre/lib";
import { getMissionBySlot, listMissionsByCompany } from "@correcre/lib/dynamodb/mission";

import {
  cancelScheduledMissionChange,
  listMissionsForCompany,
  updateMissionInDynamo,
} from "../server";
import type { UpdateMissionInput } from "../../model/types";

// ミッションの保存（運用者・管理者で共通のサーバー処理）。
// 入力検証・「月間実施回数 × 点数」の合計上限・即時反映 / 翌月反映の書き込み内容を確かめる。
const NOW = "2026-10-01T00:00:00.000Z";

function buildMission(overrides: Partial<Mission> = {}): Mission {
  return {
    companyId: "company-1",
    missionId: "mission-1",
    slotIndex: 1,
    version: 2,
    title: "挨拶",
    description: "朝の挨拶をする",
    category: "行動",
    monthlyCount: 4,
    score: 5,
    enabled: true,
    fields: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

const input: UpdateMissionInput = {
  title: " 新しい挨拶 ",
  description: "大きな声で挨拶する",
  category: "行動",
  monthlyCount: 2,
  score: 10,
  enabled: true,
  fields: [],
  analysisThresholds: null,
};

const mockedListMissions = jest.mocked(listMissionsByCompany);
const mockedGetMission = jest.mocked(getMissionBySlot);

beforeEach(() => {
  jest.clearAllMocks();
  sendMock.mockResolvedValue({});
  mockedListMissions.mockResolvedValue([]);
  mockedGetMission.mockResolvedValue(null);
});

describe("入力検証", () => {
  test("スロット番号が 1〜5 以外なら保存しない", async () => {
    await expect(updateMissionInDynamo("company-1", 6, input, "user-1")).rejects.toThrow("スロット番号が不正です。");
    expect(sendMock).not.toHaveBeenCalled();
  });

  test("タイトルが空なら保存しない", async () => {
    await expect(updateMissionInDynamo("company-1", 1, { ...input, title: "  " }, "user-1")).rejects.toThrow(
      "ミッションタイトルは必須です。",
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  test("選択肢が空白だけの選択フィールドは保存しない（画面と同じ検証）", async () => {
    const fields = [{ key: "q1", label: "質問", type: "select" as const, required: true, order: 1, options: [" "] }];

    await expect(updateMissionInDynamo("company-1", 1, { ...input, fields }, "user-1")).rejects.toThrow(
      "フィールド「質問」の選択肢が設定されていません。",
    );
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("合計点の上限", () => {
  test("有効な他スロットとの合計が 100 点を超えると保存しない", async () => {
    mockedListMissions.mockResolvedValue([
      buildMission({ slotIndex: 2, monthlyCount: 10, score: 9 }), // 90 点
    ]);

    await expect(updateMissionInDynamo("company-1", 1, input, "user-1")).rejects.toThrow(/合計 110 点/);
    expect(sendMock).not.toHaveBeenCalled();
  });

  test("無効なミッションと編集中スロットの現行値は合計に含めない", async () => {
    mockedListMissions.mockResolvedValue([
      buildMission({ slotIndex: 1, monthlyCount: 10, score: 10 }), // 編集中スロットの現行値（100 点）
      buildMission({ slotIndex: 2, monthlyCount: 10, score: 10, enabled: false }), // 無効（100 点）
      buildMission({ slotIndex: 3, monthlyCount: 8, score: 10 }), // 80 点
    ]);

    await expect(updateMissionInDynamo("company-1", 1, input, "user-1")).resolves.toMatchObject({ score: 10 });
  });
});

describe("即時反映", () => {
  test("既存スロットは版を上げ、旧版の履歴を閉じて新版の履歴を変更者付きで書く", async () => {
    mockedGetMission.mockResolvedValue(buildMission());

    const result = await updateMissionInDynamo("company-1", 1, input, "admin-1", "immediate");

    expect(result).toMatchObject({ version: 3, title: "新しい挨拶", configured: true, pendingChange: null });
    const command = sendMock.mock.calls[0][0] as TransactWriteCommand;
    const items = command.input.TransactItems!;
    expect(items).toHaveLength(3);
    expect(items[0].Update?.Key).toEqual({ pk: "COMPANY#company-1#MISSION#mission-1", sk: "VER#2" });
    expect(items[1].Put?.Item).toMatchObject({ companyId: "company-1", sk: "MISSION#1", version: 3 });
    // 予約(pendingChange)は Put による全置き換えで消える
    expect(items[1].Put?.Item).not.toHaveProperty("pendingChange");
    expect(items[2].Put?.Item).toMatchObject({ version: 3, changedByUserId: "admin-1", validTo: null });
  });

  test("未設定スロットは v1 を条件付きで作成する", async () => {
    const result = await updateMissionInDynamo("company-1", 4, input, "admin-1");

    expect(result).toMatchObject({ slotIndex: 4, version: 1 });
    const items = (sendMock.mock.calls[0][0] as TransactWriteCommand).input.TransactItems!;
    expect(items).toHaveLength(2);
    expect(items[0].Put?.ConditionExpression).toBe("attribute_not_exists(companyId) AND attribute_not_exists(sk)");
    expect(items[1].Put?.Item).toMatchObject({ version: 1, changedByUserId: "admin-1" });
  });
});

describe("翌月月初から反映", () => {
  test("版は上げずに pendingChange を予約者付きで載せる", async () => {
    mockedGetMission.mockResolvedValue(buildMission());

    const result = await updateMissionInDynamo("company-1", 1, input, "admin-1", "scheduled");

    expect(result.version).toBe(2);
    expect(result.pendingChange).toMatchObject({
      effectiveYearMonth: nextMonthYYYYMM(nowYYYYMM()),
      title: "新しい挨拶",
      scheduledByUserId: "admin-1",
    });
    const command = sendMock.mock.calls[0][0] as UpdateCommand;
    expect(command.input.Key).toEqual({ companyId: "company-1", sk: "MISSION#1" });
    expect(command.input.ExpressionAttributeValues?.[":pc"]).toMatchObject({ scheduledByUserId: "admin-1" });
  });

  test("未設定スロットは予約できない", async () => {
    await expect(updateMissionInDynamo("company-1", 1, input, "admin-1", "scheduled")).rejects.toThrow(
      "新規スロットは即時反映のみ可能です。",
    );
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("予約の取り消し", () => {
  test("指定企業・スロットの pendingChange を除去する", async () => {
    sendMock.mockResolvedValue({ Attributes: buildMission({ slotIndex: 2 }) });

    const result = await cancelScheduledMissionChange("company-1", 2);

    expect(result).toMatchObject({ slotIndex: 2, pendingChange: null });
    const command = sendMock.mock.calls[0][0] as UpdateCommand;
    expect(command.input.Key).toEqual({ companyId: "company-1", sk: "MISSION#2" });
    expect(command.input.UpdateExpression).toContain("REMOVE pendingChange");
  });
});

describe("一覧", () => {
  test("未設定スロットを空のサマリーで埋めて常に 5 件返す", async () => {
    mockedListMissions.mockResolvedValue([buildMission({ slotIndex: 3 })]);

    const result = await listMissionsForCompany("company-1");

    expect(result.map((m) => [m.slotIndex, m.configured])).toEqual([
      [1, false],
      [2, false],
      [3, true],
      [4, false],
      [5, false],
    ]);
    expect(mockedListMissions).toHaveBeenCalledWith(expect.anything(), "company-1");
  });
});
