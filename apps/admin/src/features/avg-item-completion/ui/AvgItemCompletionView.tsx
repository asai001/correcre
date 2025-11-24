"use client";

import { useMemo } from "react";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Chart from "@employee/components/Chart";
import type { ChartConfiguration } from "chart.js";

type Props = {
  icon: IconDefinition;
  iconColor?: string;
  className?: string;
  labels: string[];
  values: number[];
};

export default function AvgItemCompletionView({ icon, iconColor = "#2563EB", className, labels, values }: Props) {
  const config = useMemo<ChartConfiguration>(() => {
    return {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "平均達成割合",
            data: values,
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
            max: 100,
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
    };
  }, [labels, values]);

  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 mb-8 ${className ?? ""}`}>
      <div className="flex items-center mb-4">
        <FontAwesomeIcon icon={icon} className="text-xl lg:text-2xl mr-3" style={{ color: iconColor }} />
        <div className="text-lg lg:text-2xl font-bold">項目ごとの平均達成割合（先月）</div>
      </div>

      <Chart className={className} height={400} config={config} />
    </div>
  );
}
