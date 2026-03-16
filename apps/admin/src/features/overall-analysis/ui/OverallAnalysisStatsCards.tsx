"use client";

type StatCardProps = {
  label: string;
  value: string;
  color: string;
};

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className="flex h-full min-h-[120px] flex-col items-center justify-center rounded-lg border border-slate-200 bg-white px-6 py-5 shadow-sm">
      <p className="mb-2 text-xl font-bold text-slate-600">{label}</p>
      <p className="text-3xl font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

type OverallAnalysisStatsCardsProps = {
  averageScore: number;
  totalEarnedPoints: number;
  companyPointBalance: number;
  className?: string;
};

function formatMetric(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function OverallAnalysisStatsCards({
  averageScore,
  totalEarnedPoints,
  companyPointBalance,
  className,
}: OverallAnalysisStatsCardsProps) {
  return (
    <div className={`grid h-full grid-cols-1 gap-4 sm:grid-cols-2 sm:grid-rows-2 ${className ?? ""}`}>
      <StatCard label="期間平均得点" value={`${formatMetric(averageScore)}点`} color="#3b82f6" />
      <StatCard label="総獲得ポイント" value={`${totalEarnedPoints.toLocaleString()}pt`} color="#8b5cf6" />
      <div className="h-full sm:col-start-1 sm:row-start-2">
        <StatCard label="企業保有ポイント" value={`${companyPointBalance.toLocaleString()}pt`} color="#f59e0b" />
      </div>
    </div>
  );
}
