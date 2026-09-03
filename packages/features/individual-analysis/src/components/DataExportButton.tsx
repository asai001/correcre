"use client";

import * as React from "react";
import { faDownload, faFileCsv, faFileExcel } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";

import { downloadCsv, type CsvCell } from "../lib/csv";
import { downloadExcel } from "../lib/xlsx";

export type DataExportFormat = "csv" | "excel";

export type DataExportButtonProps = {
  /** 拡張子を除いたファイル名。禁止文字は "_" に置換される */
  fileBaseName: string;
  /** クリック時に評価される。1 行目は見出し行として扱う */
  buildRows: () => CsvCell[][];
  /** Excel のシート名 */
  sheetName?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
};

/** ファイル名に使えない文字を落とす */
export function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_").trim() || "export";
}

export default function DataExportButton({
  fileBaseName,
  buildRows,
  sheetName,
  label = "データエクスポート",
  disabled = false,
  className,
}: DataExportButtonProps) {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const handleClose = React.useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleExport = React.useCallback(
    (format: DataExportFormat) => {
      setAnchorEl(null);

      const rows = buildRows();
      const baseName = sanitizeFileName(fileBaseName);

      if (format === "csv") {
        downloadCsv(`${baseName}.csv`, rows);
        return;
      }

      downloadExcel(`${baseName}.xlsx`, rows, { sheetName });
    },
    [buildRows, fileBaseName, sheetName],
  );

  return (
    <>
      <Button
        className={className}
        variant="outlined"
        startIcon={<FontAwesomeIcon icon={faDownload} />}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open ? "true" : undefined}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{
          alignSelf: { xs: "stretch", sm: "center" },
          borderRadius: "14px",
          px: 2.5,
          py: 1.25,
          color: "#475569",
          borderColor: "#CBD5E1",
          whiteSpace: "nowrap",
          "&:hover": { borderColor: "#475569", backgroundColor: "#F8FAFC" },
        }}
      >
        {label}
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={() => handleExport("csv")}>
          <ListItemIcon>
            <FontAwesomeIcon icon={faFileCsv} style={{ color: "#0F766E" }} />
          </ListItemIcon>
          <ListItemText primary="CSV (.csv)" />
        </MenuItem>
        <MenuItem onClick={() => handleExport("excel")}>
          <ListItemIcon>
            <FontAwesomeIcon icon={faFileExcel} style={{ color: "#15803D" }} />
          </ListItemIcon>
          <ListItemText primary="Excel (.xlsx)" />
        </MenuItem>
      </Menu>
    </>
  );
}
