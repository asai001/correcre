import { notFound } from "next/navigation";

import { ExchangeDetail } from "@merchant/features/exchanges";
import { getExchangeDetailForMerchant } from "@merchant/features/exchanges/api/server";
import {
  getMerchantHeaderInfo,
  getMerchantViewerName,
  requireCurrentMerchantUser,
} from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ exchangeId: string }>;
};

export default async function ExchangeDetailPage({ params }: PageProps) {
  const [user, { exchangeId }] = await Promise.all([requireCurrentMerchantUser(), params]);

  const [detail, headerInfo] = await Promise.all([
    getExchangeDetailForMerchant(user.merchantId, exchangeId),
    getMerchantHeaderInfo(user.merchantId),
  ]);
  if (!detail) {
    notFound();
  }

  return (
    <ExchangeDetail
      initial={detail}
      merchantName={getMerchantViewerName(user)}
      merchantDisplayName={headerInfo.displayName}
    />
  );
}
