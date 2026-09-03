"use client";

import * as React from "react";

import DataExportButton from "../../components/DataExportButton";
import type { DataExportDateRange } from "../../components/DataExportDialog";
import { fetchRecentReports } from "../api/client";
import { buildRecentReportsExportRows } from "../model/export-rows";

export type RecentReportsExportButtonProps = {
  companyId: string;
  /** 指定すると、その社員の報告内容だけをエクスポートする */
  userId?: string;
  /** 表に社員名列がない（対象社員が 1 人）ときに、エクスポートへ補う社員名 */
  employeeName?: string;
  showEmployeeName: boolean;
  /** 期間を除いたファイル名。実際のファイル名には選択された期間が付く */
  fileBaseName: string;
  /** Excel のシート名 */
  sheetName?: string;
  /** モーダルの期間の初期値 */
  defaultStartDate: string;
  defaultEndDate: string;
  /** 選択できる最も古い月（企業の登録月など） */
  startYearMonth?: string;
};

export default function RecentReportsExportButton({
  companyId,
  userId,
  employeeName,
  showEmployeeName,
  fileBaseName,
  sheetName = "報告内容",
  defaultStartDate,
  defaultEndDate,
  startYearMonth,
}: RecentReportsExportButtonProps) {
  const fetchRows = React.useCallback(
    async ({ startDate, endDate }: DataExportDateRange, signal: AbortSignal) => {
      // 画面上の表示件数に関わらず、選択された期間の全件を取り直す
      const reports = await fetchRecentReports(companyId, undefined, userId, startDate, endDate, signal);

      return buildRecentReportsExportRows(reports, showEmployeeName, employeeName);
    },
    [companyId, userId, employeeName, showEmployeeName],
  );

  const buildFileBaseName = React.useCallback(
    ({ startDate, endDate }: DataExportDateRange) => `${fileBaseName}-${startDate}_${endDate}`,
    [fileBaseName],
  );

  return (
    <DataExportButton
      title="報告内容のエクスポート"
      defaultStartDate={defaultStartDate}
      defaultEndDate={defaultEndDate}
      startYearMonth={startYearMonth}
      sheetName={sheetName}
      buildFileBaseName={buildFileBaseName}
      fetchRows={fetchRows}
    />
  );
}
