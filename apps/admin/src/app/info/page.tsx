import AdminInfo from "@admin/features/info";
import { getAdminInfoData } from "@admin/features/info/api/server";
import { requireCurrentAdminUser } from "@admin/lib/auth/current-user";
import { getOperatorAccessStatus } from "@admin/lib/auth/operator";

export default async function InfoPage() {
  const currentAdminUser = await requireCurrentAdminUser();
  const [initialData, operatorAccess] = await Promise.all([
    getAdminInfoData(currentAdminUser),
    getOperatorAccessStatus(),
  ]);

  return <AdminInfo initialData={initialData} canEdit={operatorAccess.allowed} />;
}
