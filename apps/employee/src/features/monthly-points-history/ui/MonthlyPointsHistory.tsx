"use client";

import { SkeletonBlock } from "@employee/components/LoadingSkeleton";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";

import { useMonthlyPointsHistory } from "../hooks/useMonthlyPointsHistory";
import MonthlyPointsHistoryView from "./MonthlyPointsHistoryView";

type Props = {
  icon: IconDefinition;
  iconColor?: string;
  className?: string;
  companyId: string;
  userId: string;
  months?: number;
};

export default function MonthlyPointsHistory({ icon, iconColor = "#2563EB", className, companyId, userId, months = 24 }: Props) {
  const { labels, data, loading, error } = useMonthlyPointsHistory(companyId, userId, months);

  if (loading) {
    return <SkeletonBlock className={`h-[440px] ${className ?? ""}`} />;
  }

  if (error || !labels || !data) {
    return null;
  }

  return <MonthlyPointsHistoryView icon={icon} iconColor={iconColor} className={className} labels={labels} values={data} />;
}
