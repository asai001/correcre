export type MissionFieldType = "textarea" | "select" | "date" | "datetime-local";

export type MissionFieldSelectOption = {
  label: string;
  value: string | number;
};

export type MissionField = {
  id: string;
  label: string;
  type: MissionFieldType;
  rows?: number; // textarea
  placeholder?: string;
  required?: boolean;
  selectValueType?: "string" | "number"; // select
  options?: MissionFieldSelectOption[]; // select
};

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
  fields: MissionField[];
};
