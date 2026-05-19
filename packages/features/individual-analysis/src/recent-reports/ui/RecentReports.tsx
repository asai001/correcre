"use client";

import { faTable } from "@fortawesome/free-solid-svg-icons";

import { SkeletonTableCard } from "../../components/LoadingSkeleton";
import { useRecentReports } from "../hooks/useRecentReports";
import RecentReportsView, { type RecentReportsPagination } from "./RecentReportsView";

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

  if (loading) {
    return <SkeletonTableCard className={className} rowCount={pagination?.initialRowsPerPage ?? limit} />;
  }

  if (error) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>;
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
