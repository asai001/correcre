export type FieldType = "text" | "textarea" | "number" | "datetime-local" | "date" | "select" | "url";

export type Mission = {
  companyId: string;
  missionId: string;
  version: number;
  enabled: boolean;
  title: string;
  description: string;
  category: string;
  monthlyCount: number;
  score: number;
  order: number;
  fields: FieldConfig[];
};

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

export type MissionReport = {
  companyId: string;
  userId: string;
  reportId: string;
  missionId: string;
  reportedAt: string;
  status: "APPROVED" | "PENDING";
  pointGranted: number;
  comment: string;
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

export type SubmitPayload = {
  companyId: string;
  missionId: string;
  values: Record<string, any>;
  score: number;
};

export type FormConfig = {
  companyId: string;
  missionId: string;
  version: number;
  title: string;
  fields: FieldConfig[];
  points: number;
  monthlyCount: number;
  order: number;
  enabled: boolean;
};
