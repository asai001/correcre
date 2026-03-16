"use client";

import { Line } from "react-chartjs-2";
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

type TrendDataPoint = {
  month: string;
  points: number;
};

type PointsTrendChartProps = {
  data: TrendDataPoint[];
};

export default function PointsTrendChart({ data }: PointsTrendChartProps) {
  const maxPoint = data.reduce((max, item) => Math.max(max, item.points), 0);
  const yAxisMax = maxPoint > 0 ? Math.ceil(maxPoint / 100) * 100 : 100;
  const stepSize = yAxisMax <= 100 ? 20 : Math.max(50, Math.ceil(yAxisMax / 5 / 10) * 10);

  const chartData = {
    labels: data.map((item) => item.month),
    datasets: [
      {
        label: "\u7372\u5f97\u30dd\u30a4\u30f3\u30c8",
        data: data.map((item) => item.points),
        borderColor: "rgba(16, 185, 129, 1)",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: "rgba(16, 185, 129, 1)",
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "rgba(16, 185, 129, 1)",
        pointRadius: 4,
        pointHoverRadius: 6,
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
      <h3 className="mb-4 text-lg font-bold">{"\u7372\u5f97\u30dd\u30a4\u30f3\u30c8\u63a8\u79fb"}</h3>
      <div style={{ height: "400px" }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
