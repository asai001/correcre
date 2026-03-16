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
        label: "\u9054\u6210\u7387\uff08\u0025\uff09",
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
      <h3 className="mb-4 text-lg font-bold">{"\u9054\u6210\u5272\u5408\uff08\u30ec\u30fc\u30c0\u30fc\u30c1\u30e3\u30fc\u30c8\uff09"}</h3>
      <div style={{ height: "400px" }}>
        <Radar data={chartData} options={options} />
      </div>
    </div>
  );
}
