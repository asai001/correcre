"use client";

import { useAvgPointsTrend } from "../hooks/useAvgPointsTrend";
import AvgPointsTrendView from "./AvgPointsTrendView";

import { faChartLine } from "@fortawesome/free-solid-svg-icons";

type Props = {
  className?: string;
  companyId: string;
  months?: number;
};

export default function AvgPointsTrend({ className, companyId, months = 12 }: Props) {
  const { labels, data, loading, error } = useAvgPointsTrend(companyId, months);

  if (loading) {
    // とりあえず null。のちにスケルトンに差し替えやすい
    return null;
  }

  if (error) {
    // 将来的に別コンポーネントにしても良い
    return null;
  }

  return <AvgPointsTrendView icon={faChartLine} iconColor={"#2563EB"} className={className} labels={labels} values={data} />;
}
