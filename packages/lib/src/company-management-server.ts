import "server-only";

import { randomUUID } from "node:crypto";

import { getCompanyById, listCompanies, putCompany } from "./dynamodb/company";
import { readRequiredServerEnv } from "./env/server";

import type { Company, CompanyPhilosophy } from "@correcre/types";
import type {
  CompanyPhilosophyItem,
  CompanySummary,
  CreateCompanyInput,
  UpdateCompanyInput,
} from "./company-management-types";

type CompanyManagementConfig = {
  region: string;
  companyTableName: string;
};

function getCompanyManagementConfig(): CompanyManagementConfig {
  return {
    region: readRequiredServerEnv("AWS_REGION"),
    companyTableName: readRequiredServerEnv("DDB_COMPANY_TABLE_NAME"),
  };
}

function isValidCompanyStatus(status: Company["status"]) {
  return status === "ACTIVE" || status === "INACTIVE" || status === "TRIAL";
}

function isValidCompanyPlan(plan: Company["plan"]) {
  return plan === "TRIAL" || plan === "STANDARD" || plan === "ENTERPRISE";
}

async function getCompanyOrThrow(config: CompanyManagementConfig, companyId: string) {
  const company = await getCompanyById(
    {
      region: config.region,
      tableName: config.companyTableName,
    },
    companyId,
  );

  if (!company) {
    throw new Error("Company not found");
  }

  return company;
}

function normalizeCompanyPhilosophyItems(items: CreateCompanyInput["philosophyItems"]): CompanyPhilosophyItem[] {
  if (items == null) {
    return [];
  }

  if (!Array.isArray(items)) {
    throw new Error("理念体系の形式が不正です");
  }

  const usedIds = new Set<string>();

  return items.map((item, index) => {
    const label = typeof item?.label === "string" ? item.label.trim() : "";
    const content = typeof item?.content === "string" ? item.content.trim() : "";

    if (!label) {
      throw new Error(`理念体系 ${index + 1} 件目の項目名を入力してください`);
    }

    if (!content) {
      throw new Error(`理念体系 ${index + 1} 件目の内容を入力してください`);
    }

    let itemId = typeof item?.id === "string" ? item.id.trim() : "";

    if (!itemId) {
      itemId = randomUUID();
    }

    while (usedIds.has(itemId)) {
      itemId = randomUUID();
    }

    usedIds.add(itemId);

    return {
      id: itemId,
      label,
      content,
      displayOnDashboard: Boolean(item?.displayOnDashboard),
    };
  });
}

function hasLegacyCompanyPhilosophyContent(philosophy?: CompanyPhilosophy) {
  return Boolean(
    philosophy?.corporatePhilosophy ||
      philosophy?.purpose ||
      philosophy?.mission ||
      philosophy?.vision ||
      philosophy?.values?.length ||
      philosophy?.creed?.length,
  );
}

function buildCompanyPhilosophy(
  items: CompanyPhilosophyItem[],
  updatedAt: string,
  existing?: CompanyPhilosophy,
): CompanyPhilosophy | undefined {
  const entries =
    items.length > 0
      ? Object.fromEntries(
          items.map((item, index) => [
            item.id,
            {
              label: item.label,
              content: item.content,
              displayOnDashboard: item.displayOnDashboard,
              order: index,
            },
          ]),
        )
      : undefined;

  if (!entries && !hasLegacyCompanyPhilosophyContent(existing)) {
    return undefined;
  }

  return {
    corporatePhilosophy: existing?.corporatePhilosophy,
    purpose: existing?.purpose,
    mission: existing?.mission,
    vision: existing?.vision,
    values: existing?.values,
    creed: existing?.creed,
    entries,
    updatedAt,
  };
}

function toCompanyPhilosophyItems(company: Company): CompanySummary["philosophyItems"] {
  const entries = company.philosophy?.entries;

  if (!entries) {
    return [];
  }

  return Object.entries(entries)
    .map(([id, entry]) => ({
      id,
      label: entry.label,
      content: entry.content,
      displayOnDashboard: entry.displayOnDashboard,
      order: entry.order,
    }))
    .sort((left, right) => left.order - right.order || left.label.localeCompare(right.label, "ja"))
    .map(({ id, label, content, displayOnDashboard }) => ({
      id,
      label,
      content,
      displayOnDashboard,
    }));
}

export function toCompanySummary(company: Company): CompanySummary {
  return {
    companyId: company.companyId,
    companyName: company.shortName || company.name,
    legalName: company.name,
    shortName: company.shortName,
    status: company.status,
    plan: company.plan,
    employeeCount: company.totalEmployees ?? company.activeEmployees,
    activeEmployeeCount: company.activeEmployees,
    companyPointBalance: company.companyPointBalance,
    perEmployeeMonthlyFee: company.perEmployeeMonthlyFee,
    pointUnitLabel: company.pointUnitLabel ?? "pt",
    philosophyItems: toCompanyPhilosophyItems(company),
    updatedAt: company.updatedAt,
  };
}

export const toOperatorCompanySummary = toCompanySummary;

function createCompanyId(existingCompanies: Company[]) {
  const existingIds = new Set(existingCompanies.map((company) => company.companyId));

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const companyId = randomUUID();
    if (!existingIds.has(companyId)) {
      return companyId;
    }
  }

  throw new Error("会社IDの自動採番に失敗しました");
}

function validateCreateCompanyInput(input: CreateCompanyInput) {
  const name = input.name.trim();
  const perEmployeeMonthlyFee = input.perEmployeeMonthlyFee;
  const companyPointBalance = input.companyPointBalance;

  if (!name) {
    throw new Error("会社名は必須です");
  }

  if (!isValidCompanyStatus(input.status)) {
    throw new Error("会社ステータスが不正です");
  }

  if (!isValidCompanyPlan(input.plan)) {
    throw new Error("プランが不正です");
  }

  if (!Number.isInteger(perEmployeeMonthlyFee) || perEmployeeMonthlyFee < 0) {
    throw new Error("月額単価は 0 以上の整数で入力してください");
  }

  if (!Number.isInteger(companyPointBalance) || companyPointBalance < 0) {
    throw new Error("会社ポイント残高は 0 以上の整数で入力してください");
  }
}

export async function listCompaniesForManagement(): Promise<CompanySummary[]> {
  const config = getCompanyManagementConfig();
  const companies = await listCompanies({
    region: config.region,
    tableName: config.companyTableName,
  });

  return companies
    .map((company) => toCompanySummary(company))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function listOperatorCompaniesFromDynamo(): Promise<CompanySummary[]> {
  return listCompaniesForManagement();
}

export async function createCompanyInDynamo(input: CreateCompanyInput): Promise<CompanySummary> {
  const config = getCompanyManagementConfig();
  const companies = await listCompanies({
    region: config.region,
    tableName: config.companyTableName,
  });
  const normalizedPhilosophyItems = normalizeCompanyPhilosophyItems(input.philosophyItems);

  validateCreateCompanyInput(input);

  const now = new Date().toISOString();
  const companyId = createCompanyId(companies);
  const createdCompany: Company = {
    companyId,
    name: input.name.trim(),
    status: input.status,
    plan: input.plan,
    perEmployeeMonthlyFee: input.perEmployeeMonthlyFee,
    companyPointBalance: input.companyPointBalance,
    totalEmployees: 0,
    activeEmployees: 0,
    pointUnitLabel: input.pointUnitLabel?.trim() || "pt",
    philosophy: buildCompanyPhilosophy(normalizedPhilosophyItems, now),
    createdAt: now,
    updatedAt: now,
  };

  await putCompany(
    {
      region: config.region,
      tableName: config.companyTableName,
    },
    createdCompany,
  );

  return toCompanySummary(createdCompany);
}

export async function updateCompanyInDynamo(companyId: string, input: UpdateCompanyInput): Promise<CompanySummary> {
  const config = getCompanyManagementConfig();
  const company = await getCompanyOrThrow(config, companyId);
  const normalizedPhilosophyItems = normalizeCompanyPhilosophyItems(input.philosophyItems);

  validateCreateCompanyInput(input);

  const updatedAt = new Date().toISOString();
  const updatedCompany: Company = {
    ...company,
    name: input.name.trim(),
    status: input.status,
    plan: input.plan,
    perEmployeeMonthlyFee: input.perEmployeeMonthlyFee,
    companyPointBalance: input.companyPointBalance,
    pointUnitLabel: input.pointUnitLabel?.trim() || "pt",
    philosophy: buildCompanyPhilosophy(normalizedPhilosophyItems, updatedAt, company.philosophy),
    updatedAt,
  };

  await putCompany(
    {
      region: config.region,
      tableName: config.companyTableName,
    },
    updatedCompany,
  );

  return toCompanySummary(updatedCompany);
}
