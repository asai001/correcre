// @employee/components/dashboard/mission-dialog/types.ts
export type FieldType = "text" | "textarea" | "datetime-local" | "number" | "select" | "url";

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
  options?: { label: string; value: string }[]; // select
  defaultValue?: any;
};

type PointsFixed = { mode: "fixed"; value: number };
type PointsInput = { mode: "input"; min?: number; max?: number; defaultValue?: number };
type PointsAuto = { mode: "auto"; formula: (v: Record<string, any>) => number; defaultValue?: number };

export type PointsConfig = PointsFixed | PointsInput | PointsAuto;

export type FormConfig = {
  companyId: string;
  missionId: string;
  version: number;
  title: string;
  fields: FieldConfig[];
  points: PointsConfig;
  isPublished: boolean;
};

export type SubmitPayload = {
  missionId: string;
  values: Record<string, any>;
  points: number;
};
