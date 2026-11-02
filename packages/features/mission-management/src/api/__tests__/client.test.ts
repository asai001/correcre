import { createMissionApiClient } from "../client";
import type { UpdateMissionInput } from "../../model/types";

// ミッション API クライアントの URL 組み立て。
// 運用者は ?companyId= で対象企業を指定し、管理者は企業を指定しない（サーバー側でセッションの企業に固定する）。
const input: UpdateMissionInput = {
  title: "挨拶",
  description: "朝の挨拶をする",
  category: "行動",
  monthlyCount: 4,
  score: 5,
  enabled: true,
  fields: [],
  analysisThresholds: null,
};

const fetchMock = jest.fn();

function respondJson(body: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
  );
}

beforeAll(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
});

beforeEach(() => {
  fetchMock.mockReset();
});

describe("企業を指定するクライアント（運用者）", () => {
  const api = createMissionApiClient({ companyId: "company 1" });

  test("一覧は /api/missions?companyId= を GET する", async () => {
    respondJson([]);

    await api.fetchMissions();

    expect(fetchMock).toHaveBeenCalledWith("/api/missions?companyId=company%201", { cache: "no-store" });
  });

  test("更新は /api/missions/:slot?companyId= に applyMode 付きで PUT する", async () => {
    respondJson({});

    await api.updateMission(3, input, "scheduled");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/missions/3?companyId=company%201");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ ...input, applyMode: "scheduled" });
  });

  test("予約取消・履歴もクエリに企業を付ける", async () => {
    respondJson({});
    respondJson([]);

    await api.cancelScheduledChange(2);
    await api.fetchMissionHistory(2);

    expect(fetchMock.mock.calls[0][0]).toBe("/api/missions/2/scheduled?companyId=company%201");
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/missions/2/history?companyId=company%201");
  });
});

describe("企業を指定しないクライアント（管理者）", () => {
  const api = createMissionApiClient();

  test("クエリを付けずに既定のベースパスを使う", async () => {
    respondJson([]);
    respondJson({});

    await api.fetchMissions();
    await api.updateMission(1, input);

    expect(fetchMock.mock.calls[0][0]).toBe("/api/missions");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/missions/1");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).applyMode).toBe("immediate");
  });

  test("ベースパスを差し替えられる（末尾のスラッシュは除く）", async () => {
    respondJson([]);

    await createMissionApiClient({ basePath: "/api/company/missions/" }).fetchMissionHistory(5);

    expect(fetchMock.mock.calls[0][0]).toBe("/api/company/missions/5/history");
  });
});

describe("エラー", () => {
  test("API のエラーメッセージをそのまま投げる", async () => {
    respondJson({ error: "合計が上限を超えています" }, 400);

    await expect(createMissionApiClient().updateMission(1, input)).rejects.toThrow("合計が上限を超えています");
  });

  test("本文が読めなければ既定のメッセージを投げる", async () => {
    fetchMock.mockResolvedValueOnce(new Response("oops", { status: 500 }));

    await expect(createMissionApiClient().fetchMissions()).rejects.toThrow("ミッション一覧の取得に失敗しました。");
  });
});
