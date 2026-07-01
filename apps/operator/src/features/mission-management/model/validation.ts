import type { MissionField } from "@correcre/types";

import type { UpdateMissionInput } from "./types";

const FIELD_KEY_PATTERN = /^[a-zA-Z0-9_]+$/;

function isOptionalNonNegativeInteger(value?: number) {
  return value === undefined || (Number.isInteger(value) && value >= 0);
}

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
    return "点数は 1 以上の整数で入力してください。";
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

    if (field.type === "text" || field.type === "textarea") {
      if (!isOptionalNonNegativeInteger(field.minLength) || !isOptionalNonNegativeInteger(field.maxLength)) {
        return `フィールド「${field.label}」の文字数制限は 0 以上の整数で入力してください。`;
      }

      if (field.minLength !== undefined && field.maxLength !== undefined && field.minLength > field.maxLength) {
        return `フィールド「${field.label}」の最小文字数は最大文字数以下にしてください。`;
      }
    }

    if (field.type === "multiSelect") {
      if (!isOptionalNonNegativeInteger(field.minSelected) || !isOptionalNonNegativeInteger(field.maxSelected)) {
        return `フィールド「${field.label}」の選択数制限は 0 以上の整数で入力してください。`;
      }

      if (field.minSelected !== undefined && field.maxSelected !== undefined && field.minSelected > field.maxSelected) {
        return `フィールド「${field.label}」の最小選択数は最大選択数以下にしてください。`;
      }
    }
  }

  return null;
}
