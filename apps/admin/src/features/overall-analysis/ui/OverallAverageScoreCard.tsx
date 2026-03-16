"use client";

type OverallAverageScoreCardProps = {
  averageScore: number;
};

function formatMetric(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function OverallAverageScoreCard({ averageScore }: OverallAverageScoreCardProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold">期間平均得点</h3>
      <div className="flex h-[260px] flex-col items-center justify-center">
        <div className="text-5xl font-bold text-blue-600">{formatMetric(averageScore)}</div>
        <div className="mt-3 text-sm text-slate-500">点</div>
      </div>
    </div>
  );
}
