import { notFound } from "next/navigation";

import { ExchangeDetail } from "@merchant/features/exchanges";
import { getExchangeDetailForMerchant } from "@merchant/features/exchanges/api/server";
import { getMerchantDisplayName } from "@merchant/lib/auth/display-name";
import { requireCurrentMerchantUser, requireMerchantSession } from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ exchangeId: string }>;
};

export default async function ExchangeDetailPage({ params }: PageProps) {
  const [session, user, { exchangeId }] = await Promise.all([
    requireMerchantSession(),
    requireCurrentMerchantUser(),
    params,
  ]);

  const detail = await getExchangeDetailForMerchant(user.merchantId, exchangeId);
  if (!detail) {
    notFound();
  }

  return <ExchangeDetail initial={detail} merchantName={getMerchantDisplayName(session)} />;
}
