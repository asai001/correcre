import type {
  CompanyPhilosophyItem,
  CompanyPlan,
  CompanyStatus,
  CompanySummary,
  CreateCompanyInput,
  UpdateCompanyInput,
} from "./company-management-types";

export type CompanyPhilosophyItemValidation = {
  label: boolean;
  content: boolean;
};

export type CompanyFormState = {
  name: string;
  status: CompanyStatus;
  plan: CompanyPlan;
  perEmployeeMonthlyFee: string;
  companyPointBalance: string;
  pointUnitLabel: string;
  showPointExchangeLink: boolean;
  philosophyItems: CompanyPhilosophyItem[];
};

export type CompanyFormValidation = {
  name: boolean;
  perEmployeeMonthlyFee: boolean;
  companyPointBalance: boolean;
  pointUnitLabel: boolean;
  philosophyItems: CompanyPhilosophyItemValidation[];
};

export const statusOptions: Array<{ value: CompanyStatus; label: string }> = [
  { value: "ACTIVE", label: "有効" },
  { value: "TRIAL", label: "トライアル" },
  { value: "INACTIVE", label: "無効" },
];

export const planOptions: Array<{ value: CompanyPlan; label: string }> = [
  { value: "TRIAL", label: "TRIAL" },
  { value: "STANDARD", label: "STANDARD" },
  { value: "ENTERPRISE", label: "ENTERPRISE" },
];

function normalizeNonNegativeInteger(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : fallback;
}

function normalizePointUnitLabel(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : "pt";
}

function createCompanyPhilosophyItemId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `philosophy-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createEmptyCompanyPhilosophyItem(): CompanyPhilosophyItem {
  return {
    id: createCompanyPhilosophyItemId(),
    label: "",
    content: "",
    displayOnDashboard: false,
  };
}

export function createInitialCompanyFormState(): CompanyFormState {
  return {
    name: "",
    status: "ACTIVE",
    plan: "STANDARD",
    perEmployeeMonthlyFee: "3000",
    companyPointBalance: "0",
    pointUnitLabel: "pt",
    showPointExchangeLink: false,
    philosophyItems: [],
  };
}

export function createCompanyFormStateFromCompany(company: CompanySummary | null): CompanyFormState {
  if (!company) {
    return createInitialCompanyFormState();
  }

  return {
    name: company.legalName,
    status: company.status,
    plan: company.plan,
    perEmployeeMonthlyFee: String(normalizeNonNegativeInteger(company.perEmployeeMonthlyFee, 0)),
    companyPointBalance: String(normalizeNonNegativeInteger(company.companyPointBalance, 0)),
    pointUnitLabel: normalizePointUnitLabel(company.pointUnitLabel),
    showPointExchangeLink: company.showPointExchangeLink === true,
    philosophyItems: company.philosophyItems.map((item) => ({ ...item })),
  };
}

export function getCompanyFormState(form: CompanyFormState): {
  parsedMonthlyFee: number;
  parsedCompanyPointBalance: number;
  validation: CompanyFormValidation;
} {
  const parsedMonthlyFee = Number.parseInt(form.perEmployeeMonthlyFee, 10);
  const parsedCompanyPointBalance = Number.parseInt(form.companyPointBalance, 10);

  return {
    parsedMonthlyFee,
    parsedCompanyPointBalance,
    validation: {
      name: !form.name.trim(),
      perEmployeeMonthlyFee: !Number.isInteger(parsedMonthlyFee) || parsedMonthlyFee < 0,
      companyPointBalance: !Number.isInteger(parsedCompanyPointBalance) || parsedCompanyPointBalance < 0,
      pointUnitLabel: !form.pointUnitLabel.trim(),
      philosophyItems: form.philosophyItems.map((item) => ({
        label: !item.label.trim(),
        content: !item.content.trim(),
      })),
    },
  };
}

export function hasCompanyFormError(validation: CompanyFormValidation) {
  return (
    validation.name ||
    validation.perEmployeeMonthlyFee ||
    validation.companyPointBalance ||
    validation.pointUnitLabel ||
    validation.philosophyItems.some((item) => item.label || item.content)
  );
}

function toCompanyPhilosophyItems(items: CompanyPhilosophyItem[]): CompanyPhilosophyItem[] {
  return items.map((item) => ({
    id: item.id,
    label: item.label.trim(),
    content: item.content.trim(),
    displayOnDashboard: item.displayOnDashboard,
  }));
}

export function toCreateCompanyInput(
  form: CompanyFormState,
  parsedMonthlyFee: number,
  parsedCompanyPointBalance: number,
): CreateCompanyInput {
  return {
    name: form.name.trim(),
    status: form.status,
    plan: form.plan,
    perEmployeeMonthlyFee: parsedMonthlyFee,
    companyPointBalance: parsedCompanyPointBalance,
    pointUnitLabel: form.pointUnitLabel.trim(),
    showPointExchangeLink: form.showPointExchangeLink,
    philosophyItems: toCompanyPhilosophyItems(form.philosophyItems),
  };
}

export function toUpdateCompanyInput(
  companyId: string,
  form: CompanyFormState,
  parsedMonthlyFee: number,
  parsedCompanyPointBalance: number,
): UpdateCompanyInput {
  return {
    companyId,
    ...toCreateCompanyInput(form, parsedMonthlyFee, parsedCompanyPointBalance),
  };
}
