import EmployeeManagement from "@admin/features/employee-management";

const companyId = "em";
const adminUserId = "u-004";

export default function EmployeeManagementPage() {
  return <EmployeeManagement companyId={companyId} adminUserId={adminUserId} />;
}
