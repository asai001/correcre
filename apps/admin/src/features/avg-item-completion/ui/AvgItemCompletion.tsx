"use client";

import { SkeletonBlock } from "@admin/components/LoadingSkeleton";
import { toYYYYMM } from "@correcre/lib";
import { faChartLine } from "@fortawesome/free-solid-svg-icons";

import { useAvgItemCompletion } from "../hooks/useAvgItemCompletion";
import AvgItemCompletionView from "./AvgItemCompletionView";

type Props = {
  className?: string;
  companyId: string;
};

export default function AvgItemCompletion({ className, companyId }: Props) {
  const thisYearMonth = toYYYYMM(new Date());
  const { labels, data, loading, error } = useAvgItemCompletion(companyId, thisYearMonth);

  if (loading) {
    return <SkeletonBlock className={`h-[440px] ${className ?? ""}`} />;
  }

  if (error) {
    return null;
  }

  return <AvgItemCompletionView icon={faChartLine} iconColor="#2563EB" className={className} labels={labels} values={data} />;
}
