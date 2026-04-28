import "server-only";

import { listPublishedMerchandiseForEmployee } from "@employee/features/exchange/api/server";
import type { PublicMerchandiseSummary } from "@correcre/merchandise-public";

export async function listRecommendedMerchandiseForDashboard(
  limit: number = 4,
): Promise<PublicMerchandiseSummary[]> {
  const items = await listPublishedMerchandiseForEmployee();

  const sorted = [...items].sort((a, b) => {
    const aPick = a.tags?.length ?? 0;
    const bPick = b.tags?.length ?? 0;
    if (aPick !== bPick) return bPick - aPick;
    const ad = a.publishDate ?? "";
    const bd = b.publishDate ?? "";
    if (ad !== bd) return ad < bd ? 1 : -1;
    return a.merchandiseId < b.merchandiseId ? 1 : -1;
  });

  return sorted.slice(0, limit);
}
