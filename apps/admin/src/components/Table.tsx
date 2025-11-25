"use client";

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
};

export default function Table<T>({ columns, rows }: TableProps<T>) {
  return (
    <>
      <TableContainer
        component={Paper}
        sx={{
          border: "1px solid",
          borderColor: "grey.200",
          borderRadius: 2,
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
                <TableRow key={i}>
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
    </>
  );
}
