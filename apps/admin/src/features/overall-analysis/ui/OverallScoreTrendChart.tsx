"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { OverallAnalysisTrendItem } from "../model/types";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

type OverallScoreTrendChartProps = {
  data: OverallAnalysisTrendItem[];
};

export default function OverallScoreTrendChart({ data }: OverallScoreTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-2xl font-bold">平均得点推移</h3>
        <div className="flex h-[400px] items-center justify-center text-sm text-slate-400">
          指定期間のデータはありません
        </div>
      </div>
    );
  }

  const maxScore = data.reduce((max, item) => Math.max(max, item.averageScore), 0);
  const yAxisMax = Math.max(100, Math.ceil(maxScore / 10) * 10);
  const stepSize = yAxisMax <= 100 ? 20 : Math.max(20, Math.ceil(yAxisMax / 5 / 10) * 10);

  const chartData = {
    labels: data.map((item) => item.month),
    datasets: [
      {
        label: "平均得点",
        data: data.map((item) => item.averageScore),
        borderColor: "rgba(59, 130, 246, 1)",
        backgroundColor: "rgba(59, 130, 246, 0.12)",
        borderWidth: 2,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: "rgba(59, 130, 246, 1)",
        pointBorderColor: "#fff",
        pointRadius: 4,
        pointHoverRadius: 6,
        spanGaps: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: yAxisMax,
        ticks: {
          stepSize,
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-2xl font-bold">平均得点推移</h3>
      <div style={{ height: "400px" }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
