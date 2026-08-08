import { joinNameParts } from "@correcre/lib/user-profile";

import { UserManagement, listOwnMerchantUsers } from "@merchant/features/user-management";
import { getMerchantHeaderInfo, requireCurrentMerchantAdminUser } from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const currentUser = await requireCurrentMerchantAdminUser();
  const [users, headerInfo] = await Promise.all([
    listOwnMerchantUsers(currentUser.merchantId),
    getMerchantHeaderInfo(currentUser.merchantId),
  ]);

  return (
    <UserManagement
      initialUsers={users}
      merchantUserName={headerInfo.contactPersonName || joinNameParts(currentUser.lastName, currentUser.firstName)}
      merchantDisplayName={headerInfo.displayName}
    />
  );
}
