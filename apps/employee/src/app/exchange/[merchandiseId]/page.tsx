import { notFound } from "next/navigation";

import { ExchangeDetail } from "@employee/features/exchange";
import {
  getPublishedMerchandiseDetail,
  listPublishedMerchandiseForEmployee,
} from "@employee/features/exchange/api/server";
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

  const [item, favoritesResult, allItems] = await Promise.all([
    getPublishedMerchandiseDetail(merchantId, merchandiseId),
    listExchangeFavoritesForEmployee({
      companyId: currentUser.companyId,
      userId: currentUser.userId,
    }),
    listPublishedMerchandiseForEmployee(),
  ]);

  if (!item) {
    notFound();
  }

  const favoriteKeySet = new Set(
    favoritesResult.favorites.map((f) => `${f.merchantId}/${f.merchandiseId}`),
  );
  const isFavorite = favoriteKeySet.has(`${merchantId}/${merchandiseId}`);

  const relatedItems = allItems
    .filter((m) => !(m.merchantId === merchantId && m.merchandiseId === merchandiseId))
    .slice(0, 8);

  return (
    <ExchangeDetail
      item={item}
      initialPointBalance={currentUser.currentPointBalance ?? 0}
      initialIsFavorite={isFavorite}
      relatedItems={relatedItems}
      relatedFavoriteKeys={Array.from(favoriteKeySet)}
    />
  );
}
