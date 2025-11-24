"use client";

import AvgItemCompletionView from "./AvgItemCompletionView";
import { useAvgItemCompletion } from "../hooks/useAvgItemCompletion";
import { faChartLine } from "@fortawesome/free-solid-svg-icons";
import { toYYYYMM } from "@correcre/lib";

type Props = {
  className?: string;
  companyId: string;
};

export default function AvgItemCompletion({ className, companyId }: Props) {
  const thisYearMonth = toYYYYMM(new Date());
  const { labels, data, loading, error } = useAvgItemCompletion(companyId, thisYearMonth);

  if (loading) {
    // とりあえず null。のちにスケルトンに差し替えやすい
    return null;
  }

  if (error) {
    // 将来的に別コンポーネントにしても良い
    return null;
  }

  return <AvgItemCompletionView icon={faChartLine} iconColor="#2563EB" className={className} labels={labels} values={data} />;
}
