import type { MissionField } from "@correcre/types";

import { validateMissionFields, validateMissionInput } from "../validation";
import type { UpdateMissionInput } from "../types";

// ミッション編集の入力検証（画面とサーバーの両方で使う）。
const baseInput: UpdateMissionInput = {
  title: "挨拶",
  description: "朝の挨拶をする",
  category: "行動",
  monthlyCount: 4,
  score: 5,
  enabled: true,
  fields: [],
  analysisThresholds: null,
};

function field(overrides: Partial<MissionField>): MissionField {
  return { key: "q1", label: "質問", type: "text", required: false, order: 1, ...overrides };
}

describe("validateMissionInput", () => {
  test("正しい入力なら null", () => {
    expect(validateMissionInput(baseInput)).toBeNull();
  });

  test.each([
    [{ title: " " }, "ミッションタイトルは必須です。"],
    [{ description: "" }, "ミッション説明は必須です。"],
    [{ category: "" }, "カテゴリは必須です。"],
    [{ monthlyCount: 0 }, "月間実施回数は 1 以上の整数で入力してください。"],
    [{ score: 1.5 }, "点数は 1 以上の整数で入力してください。"],
  ])("%o は「%s」", (overrides, message) => {
    expect(validateMissionInput({ ...baseInput, ...overrides })).toBe(message);
  });

  test("閾値の個別設定が不正ならエラーを返す", () => {
    expect(
      validateMissionInput({ ...baseInput, analysisThresholds: { goodRate: 30, improvementRate: 60 } }),
    ).not.toBeNull();
  });
});

describe("validateMissionFields", () => {
  test("キーは英数字とアンダースコアのみ", () => {
    expect(validateMissionFields([field({ key: "質問" })])).toMatch(/フィールドキー「質問」が不正です/);
  });

  test("キーの重複を許さない", () => {
    expect(validateMissionFields([field({}), field({ label: "別" })])).toBe("フィールドキー「q1」が重複しています。");
  });

  test("選択フィールドは空白以外の選択肢が必要", () => {
    expect(validateMissionFields([field({ type: "multiSelect", options: ["", " "] })])).toBe(
      "フィールド「質問」の選択肢が設定されていません。",
    );
  });

  test("最小文字数は最大文字数以下", () => {
    expect(validateMissionFields([field({ minLength: 10, maxLength: 5 })])).toBe(
      "フィールド「質問」の最小文字数は最大文字数以下にしてください。",
    );
  });
});
