import CustomTabs from "@admin/components/CustomTabs";
import { IndividualAnalysis } from "@admin/features/individual-analysis";
import { OverallAnalysis } from "@admin/features/overall-analysis";

export default function Page() {
  return (
    <div className="mt-5">
      <CustomTabs
        tabs={[
          { label: "全体分析", content: <OverallAnalysis /> },
          { label: "個別分析", content: <IndividualAnalysis /> },
        ]}
      />
    </div>
  );
}
