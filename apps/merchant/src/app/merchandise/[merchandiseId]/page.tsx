import { notFound } from "next/navigation";

import { joinNameParts } from "@correcre/lib/user-profile";
import { MerchandiseForm } from "@merchant/features/merchandise";
import { getMerchandiseForMerchant, getMerchantCompanyName } from "@merchant/features/merchandise/api/server";
import { requireCurrentMerchantUser } from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ merchandiseId: string }>;
};

export default async function MerchandiseEditPage({ params }: PageProps) {
  const [user, { merchandiseId }] = await Promise.all([requireCurrentMerchantUser(), params]);

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
      merchantName={joinNameParts(user.lastName, user.firstName)}
      merchantCompanyName={merchantCompanyName ?? ""}
      initial={item}
    />
  );
}
