"use client";

import { Radar } from "react-chartjs-2";
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from "chart.js";

// Chart.js の必要なコンポーネントを登録
ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

type RadarDataPoint = {
  category: string;
  achievement: number;
};

type MonthlyAchievementRadarProps = {
  data: RadarDataPoint[];
};

export default function MonthlyAchievementRadar({ data }: MonthlyAchievementRadarProps) {
  const chartData = {
    labels: data.map((d) => d.category),
    datasets: [
      {
        label: "達成割合（%）",
        data: data.map((d) => d.achievement),
        backgroundColor: "rgba(59, 130, 246, 0.2)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 2,
        pointBackgroundColor: "rgba(59, 130, 246, 1)",
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "rgba(59, 130, 246, 1)",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
        },
      },
    },
    plugins: {
      legend: {
        position: "top" as const,
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-bold mb-4">月次達成割合（レーダーチャート）</h3>
      <div style={{ height: "400px" }}>
        <Radar data={chartData} options={options} />
      </div>
    </div>
  );
}
