import EmployeeManagement from "@admin/features/employee-management";
import { requireCurrentAdminUser } from "@admin/lib/auth/current-user";
import { requireOperatorSession } from "@admin/lib/auth/operator";

export default async function EmployeeManagementPage() {
  await requireOperatorSession();
  const currentUser = await requireCurrentAdminUser();

  return <EmployeeManagement companyId={currentUser.companyId} adminUserId={currentUser.userId} />;
}
