import { buildRecentReportsExportRows } from "../export-rows";
import type { RecentReport } from "../types";

function createReport(overrides: Partial<RecentReport> = {}): RecentReport {
  return {
    date: "2026-05-01T09:30:00+09:00",
    name: "浅井 元輝",
    itemName: "身の回りの掃除",
    progress: "完了",
    inputContent: "机まわりを片付けた",
    ...overrides,
  };
}

describe("buildRecentReportsExportRows", () => {
  it("報告が 0 件なら見出しも含めて空を返す", () => {
    expect(buildRecentReportsExportRows([], true)).toEqual([]);
  });

  it("社員名列ありの見出しと行を作る", () => {
    const rows = buildRecentReportsExportRows([createReport()], true);

    expect(rows[0]).toEqual(["日付", "社員名", "項目名", "進捗", "入力内容"]);
    expect(rows[1]).toEqual(["2026-05-01 09:30", "浅井 元輝", "身の回りの掃除", "完了", "机まわりを片付けた"]);
  });

  it("社員名列がない表でも、対象社員が分かっていれば社員名を補う", () => {
    const rows = buildRecentReportsExportRows([createReport()], false, "山田 太郎");

    expect(rows[0]).toEqual(["日付", "社員名", "項目名", "進捗", "入力内容"]);
    expect(rows[1]?.[1]).toBe("山田 太郎");
  });

  it("社員名が分からなければ社員名列を作らない", () => {
    const rows = buildRecentReportsExportRows([createReport()], false);

    expect(rows[0]).toEqual(["日付", "項目名", "進捗", "入力内容"]);
    expect(rows[1]).toEqual(["2026-05-01 09:30", "身の回りの掃除", "完了", "机まわりを片付けた"]);
  });

  it("画像プレースホルダを添付ファイル名に置き換える", () => {
    const rows = buildRecentReportsExportRows(
      [
        createReport({
          inputContent: "掃除した\n<image:photo1>\n<image:missing>",
          images: [
            {
              fieldKey: "photo1",
              label: "写真",
              s3Key: "companies/c1/photo1.jpg",
              originalFileName: "desk.jpg",
              contentType: "image/jpeg",
            },
          ],
        }),
      ],
      true,
    );

    expect(rows[1]?.[4]).toBe("掃除した\n[アップロード写真: desk.jpg]\n[画像なし]");
  });
});
