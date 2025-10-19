"use client";

import { useEffect, useRef } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/free-solid-svg-icons";

import Chart from "chart.js/auto";
import type { Chart as ChartType } from "chart.js";

type AvgItemCompletionChartProps = {
  icon: IconDefinition;
  iconColor?: string; // "blue" | "#2563EB" など
  labels: string[];
  data: number[];
  className?: string;
};

export default function AvgItemCompletionChart({ icon, iconColor = "#2563EB", labels, data, className }: AvgItemCompletionChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartType<"bar", number[], string> | null>(null); // 描画に間接的にかかわるのみのため、値の更新で再レンダしたくないから useRef で定義

  useEffect(() => {
    if (!canvasRef.current) return;

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "平均達成割合",
            data,
            backgroundColor: ["rgb(59, 130, 246)", "rgb(16, 185, 129)", "rgb(245, 158, 11)", "rgb(239, 68, 68)", "rgb(139, 92, 246)"],
            borderWidth: 1,
          },
        ],
      },
      options: {
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
            grid: {
              color: "rgba(0,0,0,0.1)",
            },
          },
          x: {
            grid: {
              color: "rgba(0,0,0,0.1)",
            },
          },
        },
      },
    });

    // アンマウント時に破棄（メモリリーク防止）
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [labels, data]); // labels と data は親のサーバーコンポーネントからもらうため、ぶっちゃけ依存に書かなくてもいいけど lint がうるさいから書く

  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 mb-8 ${className ?? ""}`}>
      <div className="flex items-center mb-4">
        <FontAwesomeIcon icon={icon} className="text-xl mr-3" style={{ color: iconColor }} />
        <div className="text-lg lg:text-2xl font-bold">項目ごとの平均達成割合（先月）</div>
      </div>
      <div className="h-[250px] lg:h-[400px]">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
