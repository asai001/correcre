"use client";

type StatCardProps = {
  label: string;
  value: string;
  color: string;
  className?: string;
};

function StatCard({ label, value, color, className }: StatCardProps) {
  return (
    <div className={`flex min-w-[14rem] flex-1 flex-col items-center justify-center rounded-lg bg-white p-6 shadow-sm ${className ?? ""}`}>
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

export default function EmployeeStatsCards({ earnedPoints, achievementScore, achievementRate, averageScore }: EmployeeStatsCardsProps) {
  return (
    <div className="mb-6 flex gap-4 overflow-x-auto pb-1">
      <StatCard label="獲得ポイント" value={`${earnedPoints.toLocaleString()}pt`} color="#3b82f6" />
      <StatCard label="達成点数（/100点）" value={formatMetric(achievementScore)} color="#10b981" />
      <StatCard label="達成率（%）" value={formatMetric(achievementRate)} color="#8b5cf6" />
      <StatCard label="平均スコア" value={formatMetric(averageScore)} color="#1f2937" />
    </div>
  );
}
