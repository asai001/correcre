import EmployeeManagement from "@admin/features/employee-management";
import { requireCurrentAdminUser } from "@admin/lib/auth/current-user";

export default async function EmployeeManagementPage() {
  const currentUser = await requireCurrentAdminUser();

  return <EmployeeManagement companyId={currentUser.companyId} adminUserId={currentUser.userId} />;
}
