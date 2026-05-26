import { notFound, redirect } from "next/navigation";

import { getCompanyById } from "@correcre/lib/dynamodb/company";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { joinNameParts } from "@correcre/lib/user-profile";

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

  const company = await getCompanyById(
    {
      region: readRequiredServerEnv("AWS_REGION"),
      tableName: readRequiredServerEnv("DDB_COMPANY_TABLE_NAME"),
    },
    currentUser.companyId,
  );

  if (company?.showPointExchangeLink !== true) {
    redirect("/dashboard");
  }

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

  const relatedCandidates = allItems.filter(
    (m) => !(m.merchantId === merchantId && m.merchandiseId === merchandiseId),
  );
  for (let i = relatedCandidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [relatedCandidates[i], relatedCandidates[j]] = [relatedCandidates[j], relatedCandidates[i]];
  }
  const relatedItems = relatedCandidates.slice(0, 8);

  return (
    <ExchangeDetail
      item={item}
      initialPointBalance={currentUser.currentPointBalance ?? 0}
      userName={joinNameParts(currentUser.lastName, currentUser.firstName)}
      initialProfile={{
        lastName: currentUser.lastName,
        firstName: currentUser.firstName,
        lastNameKana: currentUser.lastNameKana ?? "",
        firstNameKana: currentUser.firstNameKana ?? "",
        email: currentUser.email,
        phoneNumber: currentUser.phoneNumber,
        address: currentUser.address,
      }}
      initialIsFavorite={isFavorite}
      relatedItems={relatedItems}
      relatedFavoriteKeys={Array.from(favoriteKeySet)}
    />
  );
}
