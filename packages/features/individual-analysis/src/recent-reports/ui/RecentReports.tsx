"use client";

import { useMemo } from "react";
import { faTable } from "@fortawesome/free-solid-svg-icons";

import { SkeletonTableCard } from "../../components/LoadingSkeleton";
import {
  getAnalysisMonthEndDate,
  getAnalysisMonthStartDate,
  toAnalysisYearMonth,
} from "../../lib/analysis-date-range";
import { useRecentReports } from "../hooks/useRecentReports";
import RecentReportsExportButton from "./RecentReportsExportButton";
import RecentReportsView, { type RecentReportsPagination } from "./RecentReportsView";

export type RecentReportsExportOptions = {
  /** 期間を除いたファイル名。実際のファイル名には、モーダルで選ばれた期間が付く */
  fileBaseName: string;
  /** Excel のシート名 */
  sheetName?: string;
  /** 表に社員名列がない（対象社員が 1 人）ときに、エクスポートへ補う社員名 */
  employeeName?: string;
  /** 選択できる最も古い月（企業の登録月など） */
  startYearMonth?: string;
};

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
  /** 指定したときだけ「データエクスポート」ボタンを表示する */
  exportOptions?: RecentReportsExportOptions;
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
  exportOptions,
}: Props) {
  const { reports, loading, error } = useRecentReports(companyId, { limit, fetchAll, userId, startDate, endDate });
  // 画面側に期間の絞り込みがあればそれを、無ければ今月をモーダルの初期値にする
  const currentYearMonth = useMemo(() => toAnalysisYearMonth(new Date().toISOString().slice(0, 10)), []);
  const exportButton = exportOptions ? (
    <RecentReportsExportButton
      companyId={companyId}
      userId={userId}
      employeeName={exportOptions.employeeName}
      showEmployeeName={showEmployeeName}
      fileBaseName={exportOptions.fileBaseName}
      sheetName={exportOptions.sheetName}
      defaultStartDate={startDate ?? getAnalysisMonthStartDate(currentYearMonth)}
      defaultEndDate={endDate ?? getAnalysisMonthEndDate(currentYearMonth)}
      startYearMonth={exportOptions.startYearMonth}
    />
  ) : undefined;

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
      exportButton={exportButton}
    />
  );
}
