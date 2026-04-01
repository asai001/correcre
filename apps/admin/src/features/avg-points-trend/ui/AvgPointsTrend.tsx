"use client";

import { SkeletonBlock } from "@admin/components/LoadingSkeleton";

import { faChartLine } from "@fortawesome/free-solid-svg-icons";

import { useAvgPointsTrend } from "../hooks/useAvgPointsTrend";
import AvgPointsTrendView from "./AvgPointsTrendView";

type Props = {
  className?: string;
  companyId: string;
  months?: number;
};

export default function AvgPointsTrend({ className, companyId, months = 12 }: Props) {
  const { labels, data, loading, error } = useAvgPointsTrend(companyId, months);

  if (loading) {
    return <SkeletonBlock className={`h-[440px] ${className ?? ""}`} />;
  }

  if (error) {
    return null;
  }

  return <AvgPointsTrendView icon={faChartLine} iconColor={"#2563EB"} className={className} labels={labels} values={data} />;
}
