"use client";

import { faTable } from "@fortawesome/free-solid-svg-icons";
import RecentReportsView from "./RecentReportsView";
import { useRecentReports } from "../hooks/useRecentReports";

type Props = {
  className?: string;
  companyId: string;
  limit?: number;
  userId?: string;
  startDate?: string;
  endDate?: string;
  showEmployeeName?: boolean;
};

export default function RecentReports({
  className,
  companyId,
  limit = 5,
  userId,
  startDate,
  endDate,
  showEmployeeName = true,
}: Props) {
  const { reports, loading, error } = useRecentReports(companyId, { limit, userId, startDate, endDate });

  if (loading || error) {
    return null;
  }

  return (
    <RecentReportsView
      icon={faTable}
      iconColor="#2563EB"
      className={className}
      reports={reports}
      showEmployeeName={showEmployeeName}
    />
  );
}
