"use client";

import * as React from "react";
import { faDownload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button } from "@mui/material";

import DataExportDialog, { type DataExportDialogProps } from "./DataExportDialog";

export type DataExportButtonProps = Omit<DataExportDialogProps, "open" | "onClose"> & {
  label?: string;
  disabled?: boolean;
  className?: string;
};

/** 押すと期間・ファイル形式を選ぶモーダルを開くエクスポートボタン */
export default function DataExportButton({
  label = "データエクスポート",
  disabled = false,
  className,
  ...dialogProps
}: DataExportButtonProps) {
  const [open, setOpen] = React.useState(false);

  const handleClose = React.useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <>
      <Button
        className={className}
        variant="outlined"
        startIcon={<FontAwesomeIcon icon={faDownload} />}
        disabled={disabled}
        onClick={() => setOpen(true)}
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
      <DataExportDialog {...dialogProps} open={open} onClose={handleClose} />
    </>
  );
}
