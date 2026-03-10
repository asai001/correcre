"use client";

import RecentReportsView from "./RecentReportsView";
import { useRecentReports } from "../hooks/useRecentReports";
import { faTable } from "@fortawesome/free-solid-svg-icons";

type Props = {
  className?: string;
  companyId: string;
  limit?: number;
  userId?: string;
  showEmployeeName?: boolean;
};

export default function RecentReports({
  className,
  companyId,
  limit = 5,
  userId,
  showEmployeeName = true,
}: Props) {
  const { reports, loading, error } = useRecentReports(companyId, { limit, userId });

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
