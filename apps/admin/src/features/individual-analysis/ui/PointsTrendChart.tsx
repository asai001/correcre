"use client";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

// Chart.js の必要なコンポーネントを登録
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

type TrendDataPoint = {
  month: string; // YYYY/MM 形式
  points: number;
};

type PointsTrendChartProps = {
  data: TrendDataPoint[];
};

export default function PointsTrendChart({ data }: PointsTrendChartProps) {
  const chartData = {
    labels: data.map((d) => d.month),
    datasets: [
      {
        label: "獲得点数",
        data: data.map((d) => d.points),
        borderColor: "rgba(16, 185, 129, 1)",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4, // 曲線を滑らかに
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
        max: 100,
        ticks: {
          stepSize: 10,
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
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-bold mb-4">獲得点数推移（12ヶ月）</h3>
      <div style={{ height: "400px" }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
