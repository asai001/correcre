import * as React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Link as MuiLink,
  TablePagination,
  Typography,
} from "@mui/material";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { toYYYYMMDDHHmm } from "@correcre/lib";
import DataExportButton from "../../components/DataExportButton";
import type { CsvCell } from "../../lib/csv";
import Table, { ColumnDef } from "../../components/Table";
import type { RecentReport, RecentReportImageRef } from "../model/types";

const IMAGE_PLACEHOLDER_PATTERN = /<image:([^>]+)>/g;

function formatReportDateTime(date: string) {
  return toYYYYMMDDHHmm(new Date(date)).replace("T", " ");
}

type SelectedImage = {
  fieldKey: string;
  label: string;
  s3Key: string;
  originalFileName: string;
  contentType: string;
};

async function fetchMissionReportImageViewUrl(s3Key: string): Promise<string> {
  const params = new URLSearchParams({ s3Key }).toString();
  const res = await fetch(`/api/mission-report-image-view-url?${params}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`failed to issue view url: ${res.status} ${errorBody}`);
  }

  const data = (await res.json()) as { url: string };
  return data.url;
}

function renderInputContent(
  inputContent: string,
  images: RecentReportImageRef[] | undefined,
  onClickImage: (image: SelectedImage) => void,
): React.ReactNode {
  if (!inputContent) {
    return null;
  }

  const imagesByKey = new Map((images ?? []).map((image) => [image.fieldKey, image]));

  return inputContent.split("\n").map((line, lineIdx) => {
    const parts: React.ReactNode[] = [];
    let cursor = 0;
    let match: RegExpExecArray | null;

    IMAGE_PLACEHOLDER_PATTERN.lastIndex = 0;
    while ((match = IMAGE_PLACEHOLDER_PATTERN.exec(line)) !== null) {
      if (match.index > cursor) {
        parts.push(line.slice(cursor, match.index));
      }

      const fieldKey = match[1];
      const image = imagesByKey.get(fieldKey);

      if (image) {
        parts.push(
          <MuiLink
            key={`${lineIdx}-${match.index}`}
            component="button"
            type="button"
            onClick={() => onClickImage(image)}
            sx={{ textDecoration: "underline", cursor: "pointer", verticalAlign: "baseline" }}
          >
            アップロード写真
          </MuiLink>,
        );
      } else {
        parts.push("(画像なし)");
      }

      cursor = match.index + match[0].length;
    }

    if (cursor < line.length) {
      parts.push(line.slice(cursor));
    }

    return (
      <React.Fragment key={lineIdx}>
        {parts.length > 0 ? parts : line}
        {"\n"}
      </React.Fragment>
    );
  });
}

/** 画像プレースホルダを、そのままでは意味が読み取れないので添付ファイル名に置き換える */
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

export type RecentReportsPagination = {
  rowsPerPageOptions?: number[];
  initialRowsPerPage?: number;
};

export type RecentReportsExportOptions = {
  /** 拡張子を除いたファイル名 */
  fileBaseName: string;
  /** Excel のシート名 */
  sheetName?: string;
  /** 表に社員名列がない（対象社員が 1 人）ときに、エクスポートへ補う社員名 */
  employeeName?: string;
};

type RecentReportsViewProps = {
  icon: IconDefinition;
  iconColor?: string;
  className?: string;
  reports: RecentReport[];
  pagination?: RecentReportsPagination;
  showEmployeeName?: boolean;
  /** 指定したときだけ「データエクスポート」ボタンを表示する */
  exportOptions?: RecentReportsExportOptions;
};

function getColumns(
  showEmployeeName: boolean,
  onClickImage: (image: SelectedImage) => void,
): ColumnDef<RecentReport>[] {
  const columns: ColumnDef<RecentReport>[] = [
    {
      id: "date",
      label: "日付",
      width: showEmployeeName ? "15%" : "18%",
      render: (row) => formatReportDateTime(row.date),
    },
  ];

  if (showEmployeeName) {
    columns.push({
      id: "name",
      label: "社員名",
      width: "10%",
    });
  }

  columns.push(
    {
      id: "itemName",
      label: "項目名",
      width: showEmployeeName ? "15%" : "18%",
    },
    {
      id: "progress",
      label: "進捗",
      width: "10%",
    },
    {
      id: "inputContent",
      label: "入力内容",
      align: "left",
      render: (row) => renderInputContent(row.inputContent, row.images, onClickImage),
    }
  );

  return columns;
}

export default function RecentReportsView({
  icon,
  iconColor = "#2563EB",
  className,
  reports,
  pagination,
  showEmployeeName = true,
  exportOptions,
}: RecentReportsViewProps) {
  const [selectedImage, setSelectedImage] = React.useState<SelectedImage | null>(null);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [imageLoading, setImageLoading] = React.useState(false);
  const [imageError, setImageError] = React.useState<string | null>(null);

  const handleClickImage = React.useCallback((image: SelectedImage) => {
    setSelectedImage(image);
  }, []);

  const handleCloseImage = React.useCallback(() => {
    setSelectedImage(null);
    setImageUrl(null);
    setImageError(null);
  }, []);

  React.useEffect(() => {
    if (!selectedImage) {
      return;
    }

    let cancelled = false;
    setImageLoading(true);
    setImageError(null);
    setImageUrl(null);

    fetchMissionReportImageViewUrl(selectedImage.s3Key)
      .then((url) => {
        if (!cancelled) {
          setImageUrl(url);
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setImageError("画像の表示用URLの取得に失敗しました。");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setImageLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedImage]);

  const columns = React.useMemo(() => getColumns(showEmployeeName, handleClickImage), [showEmployeeName, handleClickImage]);
  const buildExportRows = React.useCallback(
    () => buildRecentReportsExportRows(reports, showEmployeeName, exportOptions?.employeeName),
    [reports, showEmployeeName, exportOptions?.employeeName],
  );
  const hasPagination = Boolean(pagination);
  const rowsPerPageOptions = React.useMemo(
    () => (pagination?.rowsPerPageOptions?.length ? pagination.rowsPerPageOptions : [5, 10, 25, 50]),
    [pagination?.rowsPerPageOptions]
  );
  const initialRowsPerPage = React.useMemo(() => {
    if (!hasPagination) {
      return rowsPerPageOptions.includes(5) ? 5 : (rowsPerPageOptions[0] ?? 5);
    }

    const requestedValue = pagination?.initialRowsPerPage;
    return requestedValue && rowsPerPageOptions.includes(requestedValue)
      ? requestedValue
      : (rowsPerPageOptions.includes(5) ? 5 : (rowsPerPageOptions[0] ?? 5));
  }, [hasPagination, pagination, rowsPerPageOptions]);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(initialRowsPerPage);

  React.useEffect(() => {
    if (!hasPagination) {
      return;
    }

    setPage(0);
  }, [hasPagination, reports]);

  React.useEffect(() => {
    if (!hasPagination) {
      return;
    }

    const maxPage = Math.max(0, Math.ceil(reports.length / rowsPerPage) - 1);
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [hasPagination, page, reports.length, rowsPerPage]);

  const displayedReports = hasPagination ? reports.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage) : reports;
  const footer = hasPagination ? (
    <TablePagination
      component="div"
      count={reports.length}
      page={page}
      onPageChange={(_event, nextPage) => setPage(nextPage)}
      rowsPerPage={rowsPerPage}
      onRowsPerPageChange={(event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
      }}
      rowsPerPageOptions={rowsPerPageOptions}
      labelRowsPerPage={"表示件数"}
      labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
      sx={{
        borderTop: "1px solid",
        borderColor: "grey.200",
      }}
    />
  ) : undefined;

  return (
    <div className={`mb-8 rounded-2xl bg-white p-6 shadow-lg ${className ?? ""}`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
          <FontAwesomeIcon icon={icon} className="mr-3 text-xl lg:text-2xl" style={{ color: iconColor }} />
          <div className="text-lg font-bold lg:text-2xl">{"報告内容"}</div>
        </div>
        {exportOptions && (
          <DataExportButton
            fileBaseName={exportOptions.fileBaseName}
            sheetName={exportOptions.sheetName ?? "報告内容"}
            disabled={reports.length === 0}
            buildRows={buildExportRows}
          />
        )}
      </div>

      <Table columns={columns} rows={displayedReports} footer={footer} />

      <Dialog open={Boolean(selectedImage)} onClose={handleCloseImage} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
          <Box sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selectedImage?.label}
            {selectedImage?.originalFileName ? (
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {selectedImage.originalFileName}
              </Typography>
            ) : null}
          </Box>
          <IconButton onClick={handleCloseImage} aria-label="閉じる">
            <FontAwesomeIcon icon={faXmark} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 240 }}>
          {imageLoading ? (
            <CircularProgress />
          ) : imageError ? (
            <Typography color="error">{imageError}</Typography>
          ) : imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={selectedImage?.originalFileName ?? "アップロード写真"}
              style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain" }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
