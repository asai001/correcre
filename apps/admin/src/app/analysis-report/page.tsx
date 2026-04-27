import AdminPageHeader from "@admin/components/AdminPageHeader";
import CustomTabs from "@admin/components/CustomTabs";
import { IndividualAnalysis } from "@admin/features/individual-analysis";
import { OverallAnalysis } from "@admin/features/overall-analysis";
import { requireCurrentAdminUser } from "@admin/lib/auth/current-user";
import { listDepartmentsByCompany } from "@correcre/lib/dynamodb/department";
import { listUsersByCompany } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { joinNameParts } from "@correcre/lib/user-profile";

export default async function AnalysisReportPage() {
  const currentAdminUser = await requireCurrentAdminUser();
  const region = readRequiredServerEnv("AWS_REGION");
  const [users, departments] = await Promise.all([
    listUsersByCompany(
      {
        region,
        tableName: readRequiredServerEnv("DDB_USER_TABLE_NAME"),
      },
      currentAdminUser.companyId,
    ),
    listDepartmentsByCompany(
      {
        region,
        tableName: readRequiredServerEnv("DDB_DEPARTMENT_TABLE_NAME"),
      },
      currentAdminUser.companyId,
    ),
  ]);
  const employeeOptions = users
    .filter((user) => user.status !== "DELETED")
    .map((user) => ({
      userId: user.userId,
      name: joinNameParts(user.lastName, user.firstName),
      department: user.departmentName?.trim() || "部門未設定",
    }));
  const departmentOptions = departments
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "ja"))
    .map((department) => ({
      departmentId: department.departmentId,
      name: department.name,
    }));

  return (
    <div className="space-y-1 pb-5">
      <AdminPageHeader title="分析・レポート" adminName={joinNameParts(currentAdminUser.lastName, currentAdminUser.firstName)} />
      <CustomTabs
        tabs={[
          {
            label: "全体分析",
            content: <OverallAnalysis companyId={currentAdminUser.companyId} departments={departmentOptions} />,
          },
          {
            label: "個人分析",
            content: <IndividualAnalysis companyId={currentAdminUser.companyId} employees={employeeOptions} />,
          },
        ]}
      />
    </div>
  );
}
