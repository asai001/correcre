import AdminInfo from "@admin/features/info";
import { getAdminInfoData } from "@admin/features/info/api/server";
import { requireCurrentAdminUser } from "@admin/lib/auth/current-user";

export default async function InfoPage() {
  const currentAdminUser = await requireCurrentAdminUser();
  const initialData = await getAdminInfoData(currentAdminUser);

  return <AdminInfo initialData={initialData} />;
}
