import { UserManagement, listOwnMerchantUsers } from "@merchant/features/user-management";
import {
  getMerchantHeaderInfo,
  getMerchantViewerName,
  requireCurrentMerchantAdminUser,
} from "@merchant/lib/auth/merchant";

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
      merchantUserName={getMerchantViewerName(currentUser)}
      merchantDisplayName={headerInfo.displayName}
    />
  );
}
