import { getCompanyById } from "@correcre/lib/dynamodb/company";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import type { Company } from "@correcre/types";

import type { Philosophy } from "../model/types";

function getDashboardPhilosophyItems(company: Company): Philosophy["items"] {
  const entryItems = Object.entries(company.philosophy?.entries ?? {})
    .map(([id, entry]) => ({
      id,
      label: entry.label.trim(),
      content: entry.content.trim(),
      displayOnDashboard: entry.displayOnDashboard,
      order: entry.order,
    }))
    .filter((entry) => entry.displayOnDashboard && entry.label && entry.content)
    .sort((left, right) => left.order - right.order || left.label.localeCompare(right.label, "ja"))
    .map(({ id, label, content }) => ({
      id,
      label,
      content,
    }));

  if (entryItems.length) {
    return entryItems;
  }

  const legacyItems: Philosophy["items"] = [
    company.philosophy?.corporatePhilosophy?.trim()
      ? {
          id: "legacy-corporate-philosophy",
          label: "経営理念",
          content: company.philosophy.corporatePhilosophy.trim(),
        }
      : null,
    company.philosophy?.purpose?.trim()
      ? {
          id: "legacy-purpose",
          label: "PURPOSE",
          content: company.philosophy.purpose.trim(),
        }
      : null,
  ].filter((item): item is Philosophy["items"][number] => item !== null);

  return legacyItems;
}

export async function getPhilosophyFromDynamo(companyId: string): Promise<Philosophy | null> {
  const company = await getCompanyById(
    {
      region: readRequiredServerEnv("AWS_REGION"),
      tableName: readRequiredServerEnv("DDB_COMPANY_TABLE_NAME"),
    },
    companyId,
  );

  if (!company) {
    return null;
  }

  const items = getDashboardPhilosophyItems(company);

  if (!items.length) {
    return null;
  }

  return {
    items,
    updatedAt: company.philosophy?.updatedAt,
  };
}
