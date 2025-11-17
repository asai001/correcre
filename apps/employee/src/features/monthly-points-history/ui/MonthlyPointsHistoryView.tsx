import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { useMemo } from "react";
import Chart from "@employee/components/Chart";
import { ChartConfiguration } from "chart.js";

type Props = {
  icon: IconDefinition;
  iconColor?: string;
  className?: string;
  labels: string[];
  values: number[];
};

export default function MonthlyPointsHistoryView({ icon, iconColor = "#2563EB", className, labels, values }: Props) {
  const config = useMemo<ChartConfiguration>(() => {
    return {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "月間獲得ポイント",
            data: values,
            borderColor: "rgba(59, 130, 246, 1)",
            backgroundColor: "rgba(59, 130, 246, 0.12)",
            borderWidth: 3,
            pointRadius: 3,
            pointBackgroundColor: "rgba(59, 130, 246, 1)",
            pointBorderWidth: 0,
            pointHoverRadius: 5,
            fill: "origin",
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0,0,0,0.05)",
            },
          },
          x: {
            grid: {
              color: "rgba(0,0,0,0.05)",
            },
          },
        },
        plugins: {
          legend: {
            display: true,
            position: "top",
          },
        },
      },
    };
  }, [labels, values]);

  // ローディング中も骨格としては Chart を出しておいてOK
  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 mb-8 ${className ?? ""}`}>
      <div className="flex items-center mb-4">
        <FontAwesomeIcon icon={icon} className="text-xl lg:text-2xl mr-3" style={{ color: iconColor }} />
        <div className="text-lg lg:text-2xl font-bold">過去24ヶ月の実績</div>
      </div>

      <Chart className={className} height={400} config={config} />
    </div>
  );
}
