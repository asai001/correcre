import { notFound } from "next/navigation";

import { ExchangeDetail } from "@employee/features/exchange";
import { getPublishedMerchandiseDetail } from "@employee/features/exchange/api/server";
import { requireCurrentEmployeeUser } from "@employee/lib/auth/current-user";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ merchandiseId: string }>;
  searchParams: Promise<{ merchantId?: string }>;
};

export default async function ExchangeDetailPage({ params, searchParams }: PageProps) {
  const [currentUser, { merchandiseId }, search] = await Promise.all([
    requireCurrentEmployeeUser(),
    params,
    searchParams,
  ]);

  const merchantId = search.merchantId?.trim();
  if (!merchantId) {
    notFound();
  }

  const item = await getPublishedMerchandiseDetail(merchantId, merchandiseId);
  if (!item) {
    notFound();
  }

  return <ExchangeDetail item={item} initialPointBalance={currentUser.currentPointBalance ?? 0} />;
}
