"use client";

type StatCardProps = {
  label: string;
  value: string;
  color: string;
};

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg bg-white p-6 shadow-sm">
      <p className="mb-2 text-sm text-gray-600">{label}</p>
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
      <StatCard label={"\u7372\u5f97\u30dd\u30a4\u30f3\u30c8"} value={`${earnedPoints.toLocaleString()}pt`} color="#3b82f6" />
      <StatCard
        label={"\u9054\u6210\u70b9\u6570\uff08\u002f\u0031\u0030\u0030\u70b9\uff09"}
        value={formatMetric(achievementScore)}
        color="#10b981"
      />
      <StatCard label={"\u9054\u6210\u7387\uff08\u0025\uff09"} value={formatMetric(achievementRate)} color="#8b5cf6" />
      <StatCard label={"\u5e73\u5747\u30b9\u30b3\u30a2"} value={formatMetric(averageScore)} color="#1f2937" />
    </div>
  );
}
