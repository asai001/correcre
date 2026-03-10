"use client";

type StatCardProps = {
  label: string;
  value: string | number;
  color: string;
};

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col items-center justify-center">
      <p className="text-sm text-gray-600 mb-2">{label}</p>
      <p className="text-3xl font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

type EmployeeStatsCardsProps = {
  currentPoints: number;
  monthlyScore: number;
  monthlyAchievementRate: number;
  averageInputDays: number;
};

export default function EmployeeStatsCards({
  currentPoints,
  monthlyScore,
  monthlyAchievementRate,
  averageInputDays,
}: EmployeeStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard label="所持ポイント" value={`${currentPoints.toLocaleString()}pt`} color="#3b82f6" />
      <StatCard label="月次達成点数（/100点）" value={monthlyScore} color="#10b981" />
      <StatCard label="月次達成率（%）" value={monthlyAchievementRate} color="#8b5cf6" />
      <StatCard label="平均スコア" value={`${averageInputDays.toFixed(1)}`} color="#1f2937" />
    </div>
  );
}
