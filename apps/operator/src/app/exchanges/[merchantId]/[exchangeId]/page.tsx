import { notFound } from "next/navigation";

import { ExchangeDetail } from "@operator/features/exchange-management";
import { getExchangeDetailForOperator } from "@operator/features/exchange-management/api/server";
import { getOperatorDisplayName } from "@operator/lib/auth/display-name";
import { requireOperatorSession } from "@operator/lib/auth/operator";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ merchantId: string; exchangeId: string }>;
};

export default async function ExchangeDetailPage({ params }: PageProps) {
  const [session, { merchantId, exchangeId }] = await Promise.all([
    requireOperatorSession(),
    params,
  ]);

  const detail = await getExchangeDetailForOperator(merchantId, exchangeId);
  if (!detail) {
    notFound();
  }

  return <ExchangeDetail initial={detail} operatorName={getOperatorDisplayName(session)} />;
}
