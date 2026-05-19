import type { MissionField } from "@correcre/types";

import type { UpdateMissionInput } from "./types";

const FIELD_KEY_PATTERN = /^[a-zA-Z0-9_]+$/;

export function validateMissionInput(input: UpdateMissionInput): string | null {
  if (!input.title.trim()) {
    return "ミッションタイトルは必須です。";
  }

  if (!input.description.trim()) {
    return "ミッション説明は必須です。";
  }

  if (!input.category.trim()) {
    return "カテゴリは必須です。";
  }

  if (!Number.isInteger(input.monthlyCount) || input.monthlyCount < 1) {
    return "月間実施回数は 1 以上の整数で入力してください。";
  }

  if (!Number.isInteger(input.score) || input.score < 1) {
    return "スコアは 1 以上の整数で入力してください。";
  }

  return validateMissionFields(input.fields);
}

export function validateMissionFields(fields: MissionField[]): string | null {
  const keys = new Set<string>();

  for (const field of fields) {
    if (!field.key || !FIELD_KEY_PATTERN.test(field.key)) {
      return `フィールドキー「${field.key}」が不正です。英数字とアンダースコアのみ使用できます。`;
    }

    if (keys.has(field.key)) {
      return `フィールドキー「${field.key}」が重複しています。`;
    }

    keys.add(field.key);

    if (!field.label.trim()) {
      return "フィールドのラベルは必須です。";
    }

    if (
      (field.type === "select" || field.type === "multiSelect") &&
      (!field.options || field.options.length === 0 || field.options.every((o) => !o.trim()))
    ) {
      return `フィールド「${field.label}」の選択肢が設定されていません。`;
    }
  }

  return null;
}
