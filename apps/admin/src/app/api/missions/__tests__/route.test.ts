import { NextResponse } from "next/server";

import type { DBUserItem } from "@correcre/types";

import { jsonRequest, readJson, routeContext } from "@admin/test-utils/http";

jest.mock("@admin/app/api/employee-management/authorize", () => ({
  authorizeEmployeeManagementRequest: jest.fn(),
}));
jest.mock("@correcre/mission-management/server", () => ({
  ...jest.requireActual("@correcre/mission-management/server"),
  listMissionsForCompany: jest.fn(),
  updateMissionInDynamo: jest.fn(),
  cancelScheduledMissionChange: jest.fn(),
  listMissionHistoryForSlot: jest.fn(),
}));

import { authorizeEmployeeManagementRequest } from "@admin/app/api/employee-management/authorize";
import {
  cancelScheduledMissionChange,
  listMissionHistoryForSlot,
  listMissionsForCompany,
  updateMissionInDynamo,
  type MissionSlotSummary,
} from "@correcre/mission-management/server";

import { GET as listMissions } from "../route";
import { PUT as updateMission } from "../[slotIndex]/route";
import { DELETE as cancelSchedule } from "../[slotIndex]/scheduled/route";
import { GET as listHistory } from "../[slotIndex]/history/route";

// 管理者のミッション API（各種情報画面「ミッション項目」タブ）。
// 運用者の同名 API と違い、対象企業はクエリやボディでは指定できず、常にセッションの管理者が所属する企業になる。
const BASE_URL = "http://admin.test/api/missions";
const NOW = "2026-10-01T00:00:00.000Z";

const adminUser: DBUserItem = {
  companyId: "company-1",
  sk: "USER#admin-1",
  userId: "admin-1",
  lastName: "管理",
  firstName: "者",
  email: "admin@example.com",
  roles: ["ADMIN"],
  status: "ACTIVE",
  currentPointBalance: 0,
  currentMonthCompletionRate: 0,
  createdAt: NOW,
  updatedAt: NOW,
  gsi2pk: "EMAIL#admin@example.com",
};

const summary = { slotIndex: 1, title: "挨拶" } as MissionSlotSummary;

const validBody = {
  title: "挨拶",
  description: "朝の挨拶をする",
  category: "行動",
  monthlyCount: 4,
  score: 5,
  enabled: true,
  fields: [],
  analysisThresholds: null,
};

const mockedAuthorize = jest.mocked(authorizeEmployeeManagementRequest);
const mockedList = jest.mocked(listMissionsForCompany);
const mockedUpdate = jest.mocked(updateMissionInDynamo);
const mockedCancel = jest.mocked(cancelScheduledMissionChange);
const mockedHistory = jest.mocked(listMissionHistoryForSlot);

function allowAsAdmin() {
  mockedAuthorize.mockResolvedValue({ unauthorized: null, currentAdminUser: adminUser });
}

function rejectWith(status: 401 | 403) {
  mockedAuthorize.mockResolvedValue({
    unauthorized: NextResponse.json({ error: status === 401 ? "unauthorized" : "admin_only" }, { status }),
    currentAdminUser: null,
  });
}

// 4 つの Route Handler をまとめて呼べるようにする（認可の検証を全 API で共通に行うため）。
const handlers = {
  "GET /api/missions": () => listMissions(),
  "PUT /api/missions/:slotIndex": () =>
    updateMission(jsonRequest(`${BASE_URL}/1`, { method: "PUT", body: validBody }), routeContext({ slotIndex: "1" })),
  "DELETE /api/missions/:slotIndex/scheduled": () =>
    cancelSchedule(jsonRequest(`${BASE_URL}/1/scheduled`, { method: "DELETE" }), routeContext({ slotIndex: "1" })),
  "GET /api/missions/:slotIndex/history": () =>
    listHistory(jsonRequest(`${BASE_URL}/1/history`), routeContext({ slotIndex: "1" })),
};

function expectNothingCalled() {
  expect(mockedList).not.toHaveBeenCalled();
  expect(mockedUpdate).not.toHaveBeenCalled();
  expect(mockedCancel).not.toHaveBeenCalled();
  expect(mockedHistory).not.toHaveBeenCalled();
}

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedList.mockResolvedValue([summary]);
  mockedUpdate.mockResolvedValue(summary);
  mockedCancel.mockResolvedValue(summary);
  mockedHistory.mockResolvedValue([]);
});

describe.each(Object.entries(handlers))("認可: %s", (_name, call) => {
  test("未ログインなら 401 を返し、ミッションを読み書きしない", async () => {
    rejectWith(401);

    const response = await call();

    expect(response!.status).toBe(401);
    expectNothingCalled();
  });

  test("管理者として扱われないユーザーなら 403 を返し、ミッションを読み書きしない", async () => {
    rejectWith(403);

    const response = await call();

    expect(response!.status).toBe(403);
    expectNothingCalled();
  });
});

describe("テナント境界", () => {
  test("一覧はセッションの企業のものを返す", async () => {
    allowAsAdmin();

    const response = await listMissions();

    expect(response!.status).toBe(200);
    await expect(readJson(response!)).resolves.toEqual([summary]);
    expect(mockedList).toHaveBeenCalledWith("company-1");
  });

  test("更新はクエリやボディの companyId を無視し、セッションの企業・管理者で保存する", async () => {
    allowAsAdmin();

    const response = await updateMission(
      jsonRequest(`${BASE_URL}/2?companyId=other-company`, {
        method: "PUT",
        body: { ...validBody, companyId: "other-company", applyMode: "scheduled" },
      }),
      routeContext({ slotIndex: "2" }),
    );

    expect(response!.status).toBe(200);
    expect(mockedUpdate).toHaveBeenCalledWith("company-1", 2, validBody, "admin-1", "scheduled");
  });

  test("予約の取り消しはセッションの企業に対して行う", async () => {
    allowAsAdmin();

    await cancelSchedule(
      jsonRequest(`${BASE_URL}/3/scheduled?companyId=other-company`, { method: "DELETE" }),
      routeContext({ slotIndex: "3" }),
    );

    expect(mockedCancel).toHaveBeenCalledWith("company-1", 3);
  });

  test("履歴はセッションの企業のものを返す", async () => {
    allowAsAdmin();

    await listHistory(jsonRequest(`${BASE_URL}/4/history?companyId=other-company`), routeContext({ slotIndex: "4" }));

    expect(mockedHistory).toHaveBeenCalledWith("company-1", 4);
  });
});

describe("更新の入力", () => {
  test("applyMode が無ければ即時反映にする", async () => {
    allowAsAdmin();

    await updateMission(jsonRequest(`${BASE_URL}/1`, { method: "PUT", body: validBody }), routeContext({ slotIndex: "1" }));

    expect(mockedUpdate).toHaveBeenCalledWith("company-1", 1, validBody, "admin-1", "immediate");
  });

  test.each(["0", "6", "1.5", "abc"])("スロット番号 %s は 400 で保存しない", async (slotIndex) => {
    allowAsAdmin();

    const response = await updateMission(
      jsonRequest(`${BASE_URL}/${slotIndex}`, { method: "PUT", body: validBody }),
      routeContext({ slotIndex }),
    );

    expect(response!.status).toBe(400);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  test("壊れた JSON は 400 invalid_json", async () => {
    allowAsAdmin();

    const response = await updateMission(
      jsonRequest(`${BASE_URL}/1`, { method: "PUT", rawBody: "{" }),
      routeContext({ slotIndex: "1" }),
    );

    expect(response!.status).toBe(400);
    await expect(readJson(response!)).resolves.toEqual({ error: "invalid_json" });
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  test("必須項目の型が違うボディは 400 invalid_body", async () => {
    allowAsAdmin();

    const response = await updateMission(
      jsonRequest(`${BASE_URL}/1`, { method: "PUT", body: { ...validBody, score: "5" } }),
      routeContext({ slotIndex: "1" }),
    );

    expect(response!.status).toBe(400);
    await expect(readJson(response!)).resolves.toEqual({ error: "invalid_body" });
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  test("合計点の上限超過などの業務エラーは 400 でメッセージを返す", async () => {
    allowAsAdmin();
    mockedUpdate.mockRejectedValue(new Error("全ミッションの「月間実施回数 × 点数」の合計が 100 点を超えています"));

    const response = await updateMission(
      jsonRequest(`${BASE_URL}/1`, { method: "PUT", body: validBody }),
      routeContext({ slotIndex: "1" }),
    );

    expect(response!.status).toBe(400);
    await expect(readJson(response!)).resolves.toEqual({
      error: "全ミッションの「月間実施回数 × 点数」の合計が 100 点を超えています",
    });
  });

  test("DynamoDB の条件不一致は内部のメッセージを出さずに 409 を返す", async () => {
    allowAsAdmin();
    const conflict = Object.assign(new Error("The conditional request failed (correcre-mission-prod)"), {
      name: "ConditionalCheckFailedException",
      $metadata: {},
    });
    mockedUpdate.mockRejectedValue(conflict);

    const response = await updateMission(
      jsonRequest(`${BASE_URL}/1`, { method: "PUT", body: validBody }),
      routeContext({ slotIndex: "1" }),
    );

    expect(response!.status).toBe(409);
    const body = await readJson<{ error: string }>(response!);
    expect(body.error).not.toContain("correcre-mission-prod");
  });
});
