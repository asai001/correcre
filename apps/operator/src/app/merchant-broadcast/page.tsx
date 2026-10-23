import { joinNameParts } from "@correcre/lib/user-profile";

import { getMerchantBroadcastPageData, MerchantBroadcastView } from "@operator/features/merchant-broadcast";
import { requireCurrentOperatorUser } from "@operator/lib/auth/operator";

export const dynamic = "force-dynamic";

export default async function MerchantBroadcastPage() {
  const currentUser = await requireCurrentOperatorUser();
  const data = await getMerchantBroadcastPageData(currentUser);

  return (
    <MerchantBroadcastView
      data={data}
      operatorName={joinNameParts(currentUser.lastName, currentUser.firstName) || currentUser.email}
    />
  );
}
