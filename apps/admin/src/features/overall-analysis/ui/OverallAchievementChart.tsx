"use client";

import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from "chart.js";
import { Bar } from "react-chartjs-2";
import type { OverallAnalysisAchievementItem } from "../model/types";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type OverallAchievementChartProps = {
  data: OverallAnalysisAchievementItem[];
};

export default function OverallAchievementChart({ data }: OverallAchievementChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-2xl font-bold">各項目達成割合</h3>
        <div className="flex h-[400px] items-center justify-center text-sm text-slate-400">
          指定期間のデータはありません
        </div>
      </div>
    );
  }

  const chartData = {
    labels: data.map((item) => item.label),
    datasets: [
      {
        label: "達成割合",
        data: data.map((item) => item.percentage),
        backgroundColor: [
          "rgb(59, 130, 246)",
          "rgb(16, 185, 129)",
          "rgb(245, 158, 11)",
          "rgb(239, 68, 68)",
          "rgb(139, 92, 246)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: "rgba(0,0,0,0.1)",
        },
      },
      x: {
        grid: {
          color: "rgba(0,0,0,0.05)",
        },
      },
    },
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-2xl font-bold">各項目達成割合</h3>
      <div style={{ height: "400px" }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
