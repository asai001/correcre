"use client";

import { faCalendarCheck, faCoins, faTrophy } from "@fortawesome/free-solid-svg-icons";

import { SkeletonBlock } from "@employee/components/LoadingSkeleton";
import ScoreTile from "@employee/components/dashboard/ScoreTile";

import { useDashboardSummary } from "../hooks/useDashboardSummary";

type Props = {
  companyId: string;
  userId: string;
  targetYearMonth: string;
};

export default function DashboardSummary({ companyId, userId, targetYearMonth }: Props) {
  const { summary, loading, error } = useDashboardSummary(companyId, userId, targetYearMonth);

  if (loading || (!summary && !error)) {
    return (
      <div className="-mx-6 flex gap-4 overflow-x-auto overflow-y-visible px-6 py-4 md:grid md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <SkeletonBlock key={index} className="h-36 min-w-[220px] rounded-2xl md:min-w-0" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="-mx-6 px-6 py-4 text-sm text-red-600">データの取得に失敗しました。</div>;
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="-mx-6 flex gap-4 overflow-x-auto overflow-y-visible px-6 py-4 md:grid md:grid-cols-3">
      <ScoreTile
        className="min-w-[220px] md:min-w-0"
        icon={faTrophy}
        iconColor="#2563EB"
        iconBgColor="#dbeafe"
        label="今月の達成率"
        value={summary.thisMonthCompletionRate ?? "-"}
        unit="パーセント"
        color="#2563EB"
      />
      <ScoreTile
        className="min-w-[220px] md:min-w-0"
        icon={faCoins}
        iconColor="#D97706"
        iconBgColor="#fef3c7"
        label="現在の保有ポイント"
        value={summary.currentPointBalance}
        unit="ポイント"
        color="#D97706"
      />
      <ScoreTile
        className="min-w-[220px] md:min-w-0"
        icon={faCalendarCheck}
        iconColor="#059669"
        iconBgColor="#d1fae5"
        label="先月の獲得ポイント"
        value={summary.lastMonthEarnedPoints}
        unit="ポイント"
        color="#059669"
      />
    </div>
  );
}
