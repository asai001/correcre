import { notFound } from "next/navigation";

import { joinNameParts } from "@correcre/lib/user-profile";

import { MerchantSummaryView } from "@operator/features/merchant-management";
import { getMerchantSummaryDetailForOperator } from "@operator/features/merchant-management/api/merchandise-server";
import { requireCurrentOperatorUser } from "@operator/lib/auth/operator";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ merchantId: string }>;
};

export default async function MerchantSummaryDetailPage({ params }: PageProps) {
  const [currentUser, { merchantId }] = await Promise.all([requireCurrentOperatorUser(), params]);
  const summary = await getMerchantSummaryDetailForOperator(merchantId);

  if (!summary) {
    notFound();
  }

  return (
    <MerchantSummaryView
      summary={summary}
      operatorName={joinNameParts(currentUser.lastName, currentUser.firstName)}
    />
  );
}
