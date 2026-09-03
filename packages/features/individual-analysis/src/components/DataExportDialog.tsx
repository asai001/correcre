"use client";

import * as React from "react";
import { faFileCsv, faFileExcel } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  type SelectChangeEvent,
} from "@mui/material";

import {
  getAnalysisMonthEndDate,
  getAnalysisMonthSelectOptions,
  getAnalysisMonthStartDate,
  toAnalysisYearMonth,
} from "../lib/analysis-date-range";
import { downloadCsv, type CsvCell } from "../lib/csv";
import { sanitizeFileName } from "../lib/file-name";
import { downloadExcel } from "../lib/xlsx";

export type DataExportFormat = "csv" | "excel";

export type DataExportDateRange = {
  startDate: string;
  endDate: string;
};

export type DataExportDialogProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  /** 期間の初期値。ダイアログを開くたびにこの値へ戻る */
  defaultStartDate: string;
  defaultEndDate: string;
  /** 選択できる最も古い月（企業の登録月など） */
  startYearMonth?: string;
  /** Excel のシート名 */
  sheetName?: string;
  /** 拡張子を除いたファイル名を、選択された期間から組み立てる */
  buildFileBaseName: (range: DataExportDateRange) => string;
  /** 選択された期間のデータを取得する。0 件のときは空配列を返すこと */
  fetchRows: (range: DataExportDateRange, signal: AbortSignal) => Promise<CsvCell[][]>;
};

export default function DataExportDialog({
  open,
  onClose,
  title = "データエクスポート",
  description = "エクスポートする期間とファイル形式を選択してください。",
  defaultStartDate,
  defaultEndDate,
  startYearMonth,
  sheetName,
  buildFileBaseName,
  fetchRows,
}: DataExportDialogProps) {
  const [selectedStartYearMonth, setSelectedStartYearMonth] = React.useState(() => toAnalysisYearMonth(defaultStartDate));
  const [selectedEndYearMonth, setSelectedEndYearMonth] = React.useState(() => toAnalysisYearMonth(defaultEndDate));
  const [format, setFormat] = React.useState<DataExportFormat>("csv");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const monthOptions = React.useMemo(
    () =>
      getAnalysisMonthSelectOptions({
        includeYearMonths: [selectedStartYearMonth, selectedEndYearMonth],
        startYearMonth,
      }),
    [selectedStartYearMonth, selectedEndYearMonth, startYearMonth],
  );

  // 開くたびに、呼び出し側が指定した既定期間へ戻す
  React.useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedStartYearMonth(toAnalysisYearMonth(defaultStartDate));
    setSelectedEndYearMonth(toAnalysisYearMonth(defaultEndDate));
    setError(null);
    setLoading(false);
  }, [open, defaultStartDate, defaultEndDate]);

  React.useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleClose = React.useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    onClose();
  }, [onClose]);

  const handleStartYearMonthChange = (event: SelectChangeEvent) => {
    const yearMonth = event.target.value;

    setSelectedStartYearMonth(yearMonth);
    if (yearMonth > selectedEndYearMonth) {
      setSelectedEndYearMonth(yearMonth);
    }
  };

  const handleEndYearMonthChange = (event: SelectChangeEvent) => {
    const yearMonth = event.target.value;

    setSelectedEndYearMonth(yearMonth);
    if (selectedStartYearMonth > yearMonth) {
      setSelectedStartYearMonth(yearMonth);
    }
  };

  const handleExport = async () => {
    const range: DataExportDateRange = {
      startDate: getAnalysisMonthStartDate(selectedStartYearMonth),
      endDate: getAnalysisMonthEndDate(selectedEndYearMonth),
    };

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);

    try {
      const rows = await fetchRows(range, ac.signal);

      if (ac.signal.aborted) {
        return;
      }

      if (rows.length === 0) {
        setError("指定した期間に対象のデータがありません。");
        return;
      }

      const baseName = sanitizeFileName(buildFileBaseName(range));

      if (format === "csv") {
        downloadCsv(`${baseName}.csv`, rows);
      } else {
        downloadExcel(`${baseName}.xlsx`, rows, { sheetName });
      }

      handleClose();
    } catch (err) {
      if (ac.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
        return;
      }

      console.error(err);
      setError(err instanceof Error ? err.message : "データの取得に失敗しました。");
    } finally {
      if (!ac.signal.aborted) {
        setLoading(false);
      }
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {description}
        </Typography>

        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
          <FormControl fullWidth size="small">
            <InputLabel id="data-export-start-month-label">開始月</InputLabel>
            <Select
              labelId="data-export-start-month-label"
              id="data-export-start-month"
              value={selectedStartYearMonth}
              label="開始月"
              disabled={loading}
              onChange={handleStartYearMonthChange}
            >
              {monthOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel id="data-export-end-month-label">終了月</InputLabel>
            <Select
              labelId="data-export-end-month-label"
              id="data-export-end-month"
              value={selectedEndYearMonth}
              label="終了月"
              disabled={loading}
              onChange={handleEndYearMonthChange}
            >
              {monthOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Typography variant="body2" sx={{ mt: 3, mb: 1, fontWeight: 600, color: "#475569" }}>
          ファイル形式
        </Typography>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={format}
          disabled={loading}
          onChange={(_event, value: DataExportFormat | null) => {
            if (value) {
              setFormat(value);
            }
          }}
          sx={{
            "& .MuiToggleButton-root": {
              borderRadius: "12px",
              gap: 1,
              py: 1,
              textTransform: "none",
            },
          }}
        >
          <ToggleButton value="csv">
            <FontAwesomeIcon icon={faFileCsv} />
            CSV (.csv)
          </ToggleButton>
          <ToggleButton value="excel">
            <FontAwesomeIcon icon={faFileExcel} />
            Excel (.xlsx)
          </ToggleButton>
        </ToggleButtonGroup>

        {error && (
          <Box
            sx={{
              mt: 2.5,
              borderRadius: "10px",
              backgroundColor: "#FEF2F2",
              px: 1.5,
              py: 1,
              fontSize: 14,
              color: "#DC2626",
            }}
          >
            {error}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        {/* 取得中でも押せるようにして、時間のかかる期間を選んでしまったときに中断できるようにする */}
        <Button onClick={handleClose} sx={{ color: "#475569", textTransform: "none" }}>
          キャンセル
        </Button>
        <Button
          variant="contained"
          onClick={handleExport}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ borderRadius: "12px", px: 2.5, textTransform: "none" }}
        >
          {loading ? "取得中..." : "エクスポート"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
