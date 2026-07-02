import AdminPageHeader from "@admin/components/AdminPageHeader";
import CustomTabs from "@admin/components/CustomTabs";
import { IndividualAnalysis } from "@admin/features/individual-analysis";
import { OverallAnalysis } from "@admin/features/overall-analysis";
import { requireCurrentAdminUser } from "@admin/lib/auth/current-user";
import { getCompanyById } from "@correcre/lib/dynamodb/company";
import { listDepartmentsByCompany } from "@correcre/lib/dynamodb/department";
import { listUsersByCompany } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { joinNameParts } from "@correcre/lib/user-profile";

function isEmployeeUser(user: { roles: string[] }) {
  return user.roles.includes("EMPLOYEE");
}

export default async function AnalysisReportPage() {
  const currentAdminUser = await requireCurrentAdminUser();
  const region = readRequiredServerEnv("AWS_REGION");
  const [company, users, departments] = await Promise.all([
    getCompanyById(
      {
        region,
        tableName: readRequiredServerEnv("DDB_COMPANY_TABLE_NAME"),
      },
      currentAdminUser.companyId,
    ),
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
    .filter((user) => user.status !== "DELETED" && isEmployeeUser(user))
    .map((user) => ({
      userId: user.userId,
      name: joinNameParts(user.lastName, user.firstName),
      department: user.departmentName?.trim() || "部門未設定",
      isInactive: user.status === "INACTIVE",
      isInvited: user.status === "INVITED",
    }));
  const departmentOptions = departments
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "ja"))
    .map((department) => ({
      departmentId: department.departmentId,
      name: department.name,
    }));
  const departmentIds = new Set(departments.map((department) => department.departmentId));
  const hasUnassignedUsers = users.some(
    (user) => user.status === "ACTIVE" && isEmployeeUser(user) && (!user.departmentId || !departmentIds.has(user.departmentId)),
  );
  const companyRegisteredYearMonth = company?.createdAt.slice(0, 7);

  return (
    <div className="space-y-1 pb-5">
      <AdminPageHeader title="分析・レポート" adminName={joinNameParts(currentAdminUser.lastName, currentAdminUser.firstName)} />
      <CustomTabs
        tabs={[
          {
            label: "全体分析",
            content: (
              <OverallAnalysis
                companyId={currentAdminUser.companyId}
                companyRegisteredYearMonth={companyRegisteredYearMonth}
                departments={departmentOptions}
                hasUnassignedUsers={hasUnassignedUsers}
              />
            ),
          },
          {
            label: "個人分析",
            content: (
              <IndividualAnalysis
                companyId={currentAdminUser.companyId}
                companyRegisteredYearMonth={companyRegisteredYearMonth}
                employees={employeeOptions}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
