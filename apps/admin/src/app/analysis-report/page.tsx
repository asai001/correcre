import AdminPageHeader from "@admin/components/AdminPageHeader";
import CustomTabs from "@admin/components/CustomTabs";
import { IndividualAnalysis } from "@admin/features/individual-analysis";
import { OverallAnalysis } from "@admin/features/overall-analysis";
import { requireCurrentAdminUser } from "@admin/lib/auth/current-user";
import { listUsersByCompany } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";

export default async function AnalysisReportPage() {
  const currentAdminUser = await requireCurrentAdminUser();
  const users = await listUsersByCompany(
    {
      region: readRequiredServerEnv("AWS_REGION"),
      tableName: readRequiredServerEnv("DDB_USER_TABLE_NAME"),
    },
    currentAdminUser.companyId,
  );
  const employeeOptions = users
    .filter((user) => user.status !== "DELETED")
    .map((user) => ({
      userId: user.userId,
      name: user.name,
      department: user.departmentName?.trim() || "部門未設定",
    }));

  return (
    <div className="space-y-1 pb-5">
      <AdminPageHeader title="分析・レポート" adminName={currentAdminUser.name} />
      <CustomTabs
        tabs={[
          { label: "全体分析", content: <OverallAnalysis companyId={currentAdminUser.companyId} /> },
          {
            label: "個人分析",
            content: <IndividualAnalysis companyId={currentAdminUser.companyId} employees={employeeOptions} />,
          },
        ]}
      />
    </div>
  );
}
