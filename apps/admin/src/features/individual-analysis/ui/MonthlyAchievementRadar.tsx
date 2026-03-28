"use client";

import { Radar } from "react-chartjs-2";
import { Chart as ChartJS, Filler, Legend, LineElement, PointElement, RadialLinearScale, Tooltip } from "chart.js";

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
    labels: data.map((item) => item.category),
    datasets: [
      {
        label: "達成率（%）",
        data: data.map((item) => item.achievement),
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
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-2xl font-bold">{"達成割合（レーダーチャート）"}</h3>
      <div style={{ height: "400px" }}>
        <Radar data={chartData} options={options} />
      </div>
    </div>
  );
}
