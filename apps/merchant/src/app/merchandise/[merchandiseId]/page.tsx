import { notFound } from "next/navigation";

import { MerchandiseForm } from "@merchant/features/merchandise";
import { getMerchandiseForMerchant } from "@merchant/features/merchandise/api/server";
import {
  getMerchantHeaderInfo,
  getMerchantViewerName,
  requireCurrentMerchantUser,
} from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ merchandiseId: string }>;
};

export default async function MerchandiseEditPage({ params }: PageProps) {
  const [user, { merchandiseId }] = await Promise.all([requireCurrentMerchantUser(), params]);

  const [item, headerInfo] = await Promise.all([
    getMerchandiseForMerchant(user.merchantId, merchandiseId),
    getMerchantHeaderInfo(user.merchantId),
  ]);

  if (!item) {
    notFound();
  }

  return (
    <MerchandiseForm
      mode="edit"
      merchantName={getMerchantViewerName(user)}
      merchantDisplayName={headerInfo.displayName}
      merchantCompanyName={headerInfo.displayName}
      initial={item}
    />
  );
}
