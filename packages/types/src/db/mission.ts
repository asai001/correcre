// ミッション報告フォームのフィールド型
export type MissionFieldType =
  | "text"
  | "textarea"
  | "select"
  | "multiSelect"
  | "date"
  | "datetime"
  | "number";

export type MissionField = {
  key: string; // fieldValues のキー。英数字+アンダースコア。ミッション内で unique
  label: string; // 表示ラベル / プレースホルダ
  type: MissionFieldType;
  required: boolean;
  order: number; // 表示順
  options?: string[]; // select / multiSelect 用
  minLength?: number; // text / textarea 用
  maxLength?: number; // text / textarea 用
  min?: number; // number 用
  max?: number; // number 用
  minSelected?: number; // multiSelect 用
  maxSelected?: number; // multiSelect 用
  placeholder?: string;
  helpText?: string;
};

// DynamoDB Mission テーブルのアイテム型
// PK: companyId, SK: MISSION#<slotIndex>
export type Mission = {
  companyId: string;
  missionId: string;
  slotIndex: number; // 1〜5
  version: number;
  title: string;
  description: string;
  category: string;
  monthlyCount: number;
  score: number;
  enabled: boolean;
  fields: MissionField[];
  createdAt: string;
  updatedAt: string;
};

// DynamoDB MissionHistory テーブルのアイテム型
// PK: COMPANY#<companyId>#MISSION#<missionId>, SK: VER#<version>
export type MissionHistory = {
  companyId: string;
  missionId: string;
  slotIndex: number;
  version: number;
  title: string;
  description: string;
  category: string;
  monthlyCount: number;
  score: number;
  fields: MissionField[];
  validFrom: string; // ISO 8601
  validTo: string | null; // null = 現行版
  changedByUserId: string;
  createdAt: string;
};
