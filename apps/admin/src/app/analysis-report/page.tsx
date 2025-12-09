import CustomTabs from "@admin/components/CustomTabs";

export default function Page() {
  return (
    <div className="mt-5">
      <CustomTabs
        tabs={[
          { label: "全体分析", content: <div>全体分析の内容</div> },
          { label: "個別分析", content: <div>準備中...</div> },
        ]}
      />
    </div>
  );
}
