import { ExchangeList } from "@employee/features/exchange";
import { listPublishedMerchandiseForEmployee } from "@employee/features/exchange/api/server";
import { listExchangeFavoritesForEmployee } from "@employee/features/exchange-favorite/api/server";
import { requireCurrentEmployeeUser } from "@employee/lib/auth/current-user";

export const dynamic = "force-dynamic";

export default async function ExchangePage() {
  const currentUser = await requireCurrentEmployeeUser();
  const [items, favoritesResult] = await Promise.all([
    listPublishedMerchandiseForEmployee(),
    listExchangeFavoritesForEmployee({
      companyId: currentUser.companyId,
      userId: currentUser.userId,
    }),
  ]);

  return (
    <ExchangeList
      items={items}
      currentPointBalance={currentUser.currentPointBalance ?? 0}
      initialFavorites={favoritesResult.favorites}
      initialSavedFilters={favoritesResult.savedFilters}
    />
  );
}
