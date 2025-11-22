"use client";

import ScoreTile from "@admin/components/dashboard/ScoreTile";
import { useDashboardSummary } from "../hooks/useDashboardSummary";

type Props = {
  companyId: string;
  userId: string;
  targetYearMonth: string;
};

export default function DashboardSummary({ companyId, userId, targetYearMonth }: Props) {
  const { summary, loading, error } = useDashboardSummary(companyId, userId, targetYearMonth);

  console.log("summary", summary);

  if (loading) {
    // 将来スケルトンに差し替え
    return null;
  }

  if (error) {
    return <div className="-mx-6 px-6 py-4 text-sm text-red-600">データの取得に失敗しました。</div>;
  }

  if (!summary) {
    // データはないけどエラーではないケース（ユーザー登録直後など）
    return null;
  }

  return (
    <div className="-mx-6 px-6 flex gap-4 overflow-x-auto overflow-y-visible py-4 md:grid md:grid-cols-3">
      <ScoreTile
        className="min-w-[220px] md:min-w-0"
        label="先月総獲得ポイント"
        value={summary.lastMonthEarnedPoints}
        unit="ポイント"
        color="#2563EB"
      />
      <ScoreTile
        className="min-w-[220px] md:min-w-0"
        label="今月交換ポイント"
        value={summary.thisMonthExchangePoints}
        unit="ポイント"
        color="#D97706"
      />
      <ScoreTile
        className="min-w-[220px] md:min-w-0"
        label="企業保有ポイント"
        value={summary.currentCompanyPointBalance}
        unit="ポイント"
        color="#059669"
      />
    </div>
  );
}
