import { notFound } from "next/navigation";

import { joinNameParts } from "@correcre/lib/user-profile";
import { ExchangeDetail } from "@merchant/features/exchanges";
import { getExchangeDetailForMerchant } from "@merchant/features/exchanges/api/server";
import { getMerchantDisplayName, requireCurrentMerchantUser } from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ exchangeId: string }>;
};

export default async function ExchangeDetailPage({ params }: PageProps) {
  const [user, { exchangeId }] = await Promise.all([requireCurrentMerchantUser(), params]);

  const [detail, merchantDisplayName] = await Promise.all([
    getExchangeDetailForMerchant(user.merchantId, exchangeId),
    getMerchantDisplayName(user.merchantId),
  ]);
  if (!detail) {
    notFound();
  }

  return (
    <ExchangeDetail
      initial={detail}
      merchantName={joinNameParts(user.lastName, user.firstName)}
      merchantDisplayName={merchantDisplayName}
    />
  );
}
