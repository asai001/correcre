"use client";

import { faTable } from "@fortawesome/free-solid-svg-icons";
import RecentReportsView, { type RecentReportsPagination } from "./RecentReportsView";
import { useRecentReports } from "../hooks/useRecentReports";

type Props = {
  className?: string;
  companyId: string;
  limit?: number;
  fetchAll?: boolean;
  pagination?: RecentReportsPagination;
  userId?: string;
  startDate?: string;
  endDate?: string;
  showEmployeeName?: boolean;
};

export default function RecentReports({
  className,
  companyId,
  limit = 5,
  fetchAll = false,
  pagination,
  userId,
  startDate,
  endDate,
  showEmployeeName = true,
}: Props) {
  const { reports, loading, error } = useRecentReports(companyId, { limit, fetchAll, userId, startDate, endDate });

  if (loading || error) {
    return null;
  }

  return (
    <RecentReportsView
      icon={faTable}
      iconColor="#2563EB"
      className={className}
      reports={reports}
      pagination={pagination}
      showEmployeeName={showEmployeeName}
    />
  );
}
