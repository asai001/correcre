import { notFound } from "next/navigation";

import { joinNameParts } from "@correcre/lib/user-profile";

import { MerchantMerchandiseView } from "@operator/features/merchant-management";
import {
  getMerchantForOperator,
  listMerchandiseForOperator,
} from "@operator/features/merchant-management/api/merchandise-server";
import { requireCurrentOperatorUser } from "@operator/lib/auth/operator";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ merchantId: string }>;
};

export default async function MerchantMerchandisePage({ params }: PageProps) {
  const [currentUser, { merchantId }] = await Promise.all([requireCurrentOperatorUser(), params]);

  const merchant = await getMerchantForOperator(merchantId);

  if (!merchant) {
    notFound();
  }

  const items = await listMerchandiseForOperator(merchantId);

  return (
    <MerchantMerchandiseView
      merchant={merchant}
      initialItems={items}
      operatorName={joinNameParts(currentUser.lastName, currentUser.firstName)}
    />
  );
}
