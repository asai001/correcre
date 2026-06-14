import { notFound } from "next/navigation";

import { ExchangeDetail } from "@operator/features/exchange-management";
import { getExchangeDetailForOperator } from "@operator/features/exchange-management/api/server";
import { joinNameParts } from "@correcre/lib/user-profile";
import { requireCurrentOperatorUser } from "@operator/lib/auth/operator";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ merchantId: string; exchangeId: string }>;
};

export default async function ExchangeDetailPage({ params }: PageProps) {
  const [currentUser, { merchantId, exchangeId }] = await Promise.all([
    requireCurrentOperatorUser(),
    params,
  ]);

  const detail = await getExchangeDetailForOperator(merchantId, exchangeId);
  if (!detail) {
    notFound();
  }

  return (
    <ExchangeDetail
      initial={detail}
      operatorName={joinNameParts(currentUser.lastName, currentUser.firstName)}
    />
  );
}
