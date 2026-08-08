// ミッション報告フォームのフィールド型
export type MissionFieldType =
  | "text"
  | "textarea"
  | "select"
  | "multiSelect"
  | "date"
  | "datetime"
  | "number"
  | "image";

// image フィールドの fieldValues に保存する形
export type MissionImageFieldValue = {
  s3Key: string;
  contentType: string;
  originalFileName: string;
  size: number;
  uploadedAt: string; // ISO 8601
};

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

// ミッションの「翌月月初(00:00 JST)から反映」予約。
// 実体は Mission アイテムに載せ、読み取り時に reflectMission() で反映判定する
// （ポイントの翌月反映 reflectPoints と同じ遅延反映モデル）。
// 予約は版番号を消費せず、実際に反映される時点で採番する。
export type ScheduledMissionChange = {
  effectiveYearMonth: string; // YYYY-MM（翌月）。現在月 >= これ で反映される
  title: string;
  description: string;
  category: string;
  monthlyCount: number;
  score: number;
  enabled: boolean;
  fields: MissionField[];
  scheduledByUserId: string;
  scheduledAt: string; // ISO 8601
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
  // 「翌月月初から反映」予約。未反映のスケジュール変更が1件だけ載る（無ければ undefined）。
  pendingChange?: ScheduledMissionChange;
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
