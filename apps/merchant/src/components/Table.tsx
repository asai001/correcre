"use client";

import type { KeyboardEvent } from "react";
import { Table as MuiTable, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from "@mui/material";

export type ColumnDef<T> = {
  id: Extract<keyof T, string>;
  label: string;
  align?: "left" | "right" | "center";
  width?: string | number;
  render?: (row: T) => React.ReactNode;
};

export type TableProps<T> = {
  columns: ColumnDef<T>[];
  rows: T[];
  footer?: React.ReactNode;
  getRowKey?: (row: T, index: number) => string | number;
  onRowClick?: (row: T) => void;
  getRowAriaLabel?: (row: T) => string;
};

export default function Table<T>({ columns, rows, footer, getRowKey, onRowClick, getRowAriaLabel }: TableProps<T>) {
  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (!onRowClick) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowClick(row);
    }
  };

  return (
    <Paper
      sx={{
        border: "1px solid",
        borderColor: "grey.200",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <TableContainer
        sx={{
          overflow: "auto",
        }}
      >
        <MuiTable
          sx={{
            "& th, & td": {
              borderColor: "grey.200",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            },
            minWidth: 680,
          }}
        >
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.id} align={col.align ?? "left"} style={col.width ? { width: col.width } : undefined}>
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, i) => {
              return (
                <TableRow
                  key={getRowKey ? getRowKey(row, i) : i}
                  hover={Boolean(onRowClick)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={onRowClick ? (event) => handleRowKeyDown(event, row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  aria-label={onRowClick && getRowAriaLabel ? getRowAriaLabel(row) : undefined}
                  sx={
                    onRowClick
                      ? {
                          cursor: "pointer",
                          "&:focus-visible": {
                            outline: "2px solid",
                            outlineColor: "primary.main",
                            outlineOffset: "-2px",
                          },
                        }
                      : undefined
                  }
                >
                  {columns.map((col) => (
                    <TableCell key={col.id} align={col.align ?? "left"}>
                      {col.render ? col.render(row) : (row[col.id] as React.ReactNode)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </MuiTable>
      </TableContainer>
      {footer}
    </Paper>
  );
}
