"use client";

import RecentReportsView from "./RecentReportsView";
import { useRecentReports } from "../hooks/useRecentReports";
import { faTable } from "@fortawesome/free-solid-svg-icons";

type Props = {
  className?: string;
  companyId: string;
  limit?: number;
};

export default function RecentReports({ className, companyId, limit = 5 }: Props) {
  const { reports, loading, error } = useRecentReports(companyId, { limit });

  if (loading) {
    // とりあえず null。のちにスケルトンに差し替えやすい
    return null;
  }

  if (error) {
    // 将来的に別コンポーネントにしても良い
    return null;
  }

  return <RecentReportsView icon={faTable} iconColor="#2563EB" className={className} reports={reports} />;
}
