"use client";

import { useEffect, useRef } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";

import ChartJs from "chart.js/auto";
import type { Chart as ChartInstance, ChartConfiguration } from "chart.js";

type ChartProps = {
  /** 左上に表示するアイコン（不要なら undefined でOK） */
  icon?: IconDefinition;
  /** アイコン色 */
  iconColor?: string;
  /** カード上部のタイトル（「過去24ヶ月の実績」など） */
  title?: React.ReactNode;
  /** 追加のクラス */
  className?: string;
  /** グラフ部分の高さ（px or CSS文字列） */
  height?: number | string;
  /** Chart.js にそのまま渡す config */
  config: ChartConfiguration;
};

export default function Chart({ icon, iconColor = "#2563EB", title, className, height = 250, config }: ChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartInstance | null>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    // 既存チャートがあれば破棄
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) {
      return;
    }

    // Chart.js 初期化
    chartRef.current = new ChartJs(ctx, config);

    // アンマウント / 再描画時のクリーンアップ
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [config]); // config は親側で useMemo する前提

  const heightStyle = typeof height === "number" ? { height: `${height}px` } : { height };

  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 mb-8 ${className ?? ""}`}>
      {(icon || title) && (
        <div className="flex items-center mb-4">
          {icon && <FontAwesomeIcon icon={icon} className="text-xl mr-3" style={{ color: iconColor }} />}
          {title && <div className="text-lg lg:text-2xl font-bold">{title}</div>}
        </div>
      )}
      <div className="w-full" style={heightStyle}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
