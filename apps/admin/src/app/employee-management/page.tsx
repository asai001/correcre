import EmployeeManagement from "@admin/features/employee-management";
import { requireOperatorSession } from "@admin/lib/auth/operator";

const companyId = "em";
const adminUserId = "u-004";

export default async function EmployeeManagementPage() {
  await requireOperatorSession();
  return <EmployeeManagement companyId={companyId} adminUserId={adminUserId} />;
}
