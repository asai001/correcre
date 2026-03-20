import AdminPageHeader from "@admin/components/AdminPageHeader";
import CustomTabs from "@admin/components/CustomTabs";
import { IndividualAnalysis } from "@admin/features/individual-analysis";
import { OverallAnalysis } from "@admin/features/overall-analysis";

const adminDisplayName = "システム管理者";

export default function AnalysisReportPage() {
  return (
    <div className="space-y-1 pb-5">
      <AdminPageHeader title="分析・レポート" adminName={adminDisplayName} />
      <CustomTabs
        tabs={[
          { label: "全体分析", content: <OverallAnalysis /> },
          { label: "個人分析", content: <IndividualAnalysis /> },
        ]}
      />
    </div>
  );
}
