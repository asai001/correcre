export type FieldType = "text" | "textarea" | "number" | "datetime-local" | "date" | "select" | "url";

export type FieldConfig = {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  rows?: number; // textarea
  min?: number;
  max?: number;
  step?: number; // number
  selectValueType?: "string" | "number" | "boolean"; // select の 要素の型（ひとつの select で共通）
  options?: { label: string; value: string }[]; // select
  defaultValue?: any;
};

export type FormConfig = {
  companyId: string;
  missionId: string;
  version: number;
  title: string;
  fields: FieldConfig[];
  points: number;
  isPublished: boolean;
};

export type SubmitPayload = {
  missionId: string;
  values: Record<string, any>;
  points: number;
};

// ミッションカードの外観＆基本情報（会社ごとに可変）
export type MissionCardConfig = {
  missionId: string; // 例: "greeting" / "selfStudy" など
  title: string; // カード見出し
  desc: string; // 概要テキスト
  maxScore: number; // 月の最大スコア
  order?: number; // 表示順（小さいほど先）
  enabled?: boolean; // false なら非表示
};

// 会社ごとのミッション一覧（公開版）
// 1社につき複数ミッション
export type MissionPlan = {
  companyId: string;
  version: number;
  isPublished: boolean;
  items: MissionCardConfig[];
};

// ユーザーの進捗（current/total は会社×ミッションで変わる前提）
export type MissionProgress = {
  companyId: string;
  userId: string;
  period: string;
  missionId: string;
  current: number;
  updatedAt: string;
};
