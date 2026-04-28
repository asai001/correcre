import { notFound } from "next/navigation";

import { ExchangeDetail } from "@employee/features/exchange";
import { getPublishedMerchandiseDetail } from "@employee/features/exchange/api/server";
import { listExchangeFavoritesForEmployee } from "@employee/features/exchange-favorite/api/server";
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

  const [item, favoritesResult] = await Promise.all([
    getPublishedMerchandiseDetail(merchantId, merchandiseId),
    listExchangeFavoritesForEmployee({
      companyId: currentUser.companyId,
      userId: currentUser.userId,
    }),
  ]);

  if (!item) {
    notFound();
  }

  const isFavorite = favoritesResult.favorites.some(
    (f) => f.merchantId === merchantId && f.merchandiseId === merchandiseId,
  );

  return (
    <ExchangeDetail
      item={item}
      initialPointBalance={currentUser.currentPointBalance ?? 0}
      initialIsFavorite={isFavorite}
    />
  );
}
