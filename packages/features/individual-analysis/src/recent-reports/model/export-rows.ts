import { toYYYYMMDDHHmm } from "@correcre/lib";

import type { CsvCell } from "../../lib/csv";
import type { RecentReport, RecentReportImageRef } from "./types";

export const IMAGE_PLACEHOLDER_PATTERN = /<image:([^>]+)>/g;

export function formatReportDateTime(date: string) {
  return toYYYYMMDDHHmm(new Date(date)).replace("T", " ");
}

/** 画像プレースホルダは、そのままでは意味が読み取れないので添付ファイル名に置き換える */
function toPlainInputContent(inputContent: string, images: RecentReportImageRef[] | undefined) {
  if (!inputContent) {
    return "";
  }

  const imagesByKey = new Map((images ?? []).map((image) => [image.fieldKey, image]));

  return inputContent.replace(IMAGE_PLACEHOLDER_PATTERN, (_match, fieldKey: string) => {
    const image = imagesByKey.get(fieldKey);
    return image ? `[アップロード写真: ${image.originalFileName}]` : "[画像なし]";
  });
}

/**
 * 報告内容をエクスポート用の行データに変換する。
 * 社員名列は、表に出ているとき（showEmployeeName）か、
 * 表には出ていないが対象社員が 1 人に絞られているとき（employeeName）に付与する。
 */
export function buildRecentReportsExportRows(
  reports: RecentReport[],
  showEmployeeName: boolean,
  employeeName?: string,
): CsvCell[][] {
  if (reports.length === 0) {
    return [];
  }

  const includeEmployeeName = showEmployeeName || Boolean(employeeName);

  return [
    ["日付", ...(includeEmployeeName ? ["社員名"] : []), "項目名", "進捗", "入力内容"],
    ...reports.map((report) => [
      formatReportDateTime(report.date),
      ...(includeEmployeeName ? [showEmployeeName ? report.name : (employeeName ?? "")] : []),
      report.itemName,
      report.progress,
      toPlainInputContent(report.inputContent, report.images),
    ]),
  ];
}
