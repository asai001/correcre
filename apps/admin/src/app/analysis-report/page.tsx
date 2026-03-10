import CustomTabs from "@admin/components/CustomTabs";
import { IndividualAnalysis } from "@admin/features/individual-analysis";

export default function Page() {
  return (
    <div className="mt-5">
      <CustomTabs
        tabs={[
          { label: "全体分析", content: <div>全体分析の内容</div> },
          { label: "個別分析", content: <IndividualAnalysis /> },
        ]}
      />
    </div>
  );
}
