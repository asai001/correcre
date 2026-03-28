"use client";

type StatCardProps = {
  label: string;
  value: string;
  color: string;
};

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg bg-white p-6 shadow-sm">
      <p className="mb-2 text-xl font-bold text-gray-600">{label}</p>
      <p className="text-3xl font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

type EmployeeStatsCardsProps = {
  earnedPoints: number;
  achievementScore: number;
  achievementRate: number;
  averageScore: number;
};

function formatMetric(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function EmployeeStatsCards({
  earnedPoints,
  achievementScore,
  achievementRate,
  averageScore,
}: EmployeeStatsCardsProps) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label={"獲得ポイント"} value={`${earnedPoints.toLocaleString()}pt`} color="#3b82f6" />
      <StatCard
        label={"達成点数（/100点）"}
        value={formatMetric(achievementScore)}
        color="#10b981"
      />
      <StatCard label={"達成率（%）"} value={formatMetric(achievementRate)} color="#8b5cf6" />
      <StatCard label={"平均スコア"} value={formatMetric(averageScore)} color="#1f2937" />
    </div>
  );
}
