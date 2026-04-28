import { notFound } from "next/navigation";

import { MerchandiseForm } from "@merchant/features/merchandise";
import { getMerchandiseForMerchant, getMerchantCompanyName } from "@merchant/features/merchandise/api/server";
import { getMerchantDisplayName } from "@merchant/lib/auth/display-name";
import { requireCurrentMerchantUser, requireMerchantSession } from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ merchandiseId: string }>;
};

export default async function MerchandiseEditPage({ params }: PageProps) {
  const [session, user, { merchandiseId }] = await Promise.all([
    requireMerchantSession(),
    requireCurrentMerchantUser(),
    params,
  ]);

  const [item, merchantCompanyName] = await Promise.all([
    getMerchandiseForMerchant(user.merchantId, merchandiseId),
    getMerchantCompanyName(user.merchantId),
  ]);

  if (!item) {
    notFound();
  }

  return (
    <MerchandiseForm
      mode="edit"
      merchantName={getMerchantDisplayName(session)}
      merchantCompanyName={merchantCompanyName ?? ""}
      initial={item}
    />
  );
}
