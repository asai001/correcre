"use client";

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
    // とりあえず null。のちにスケルトンに差し替えやすい
    return null;
  }

  if (error) {
    // 将来的に別コンポーネントにしても良い
    return null;
  }

  if (!labels || !data) {
    return null;
  }

  // loading 中でもとりあえず Chart 自体は出しておく（必要ならローディング表示を足す）
  return <MonthlyPointsHistoryView icon={icon} iconColor={iconColor} className={className} labels={labels} values={data} />;
}
