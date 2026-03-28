"use client";

import { faDownload, faTable } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Table, { type ColumnDef } from "@admin/components/Table";
import { downloadCsv } from "@admin/lib/csv";
import { toYYYYMMDDHHmm } from "@correcre/lib";
import { Button, TablePagination } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import type { OverallExchangeHistoryItem } from "../model/types";

type OverallPointExchangeHistoryTableProps = {
  items: OverallExchangeHistoryItem[];
  startDate: string;
  endDate: string;
  rowsPerPageOptions?: number[];
  initialRowsPerPage?: number;
};

function formatDateTime(value: string) {
  return toYYYYMMDDHHmm(new Date(value)).replace("T", " ");
}

function getColumns(): ColumnDef<OverallExchangeHistoryItem>[] {
  return [
    {
      id: "date",
      label: "\u65e5\u6642",
      width: "22%",
      render: (row) => formatDateTime(row.date),
    },
    {
      id: "employeeName",
      label: "\u5f93\u696d\u54e1\u540d",
      width: "18%",
    },
    {
      id: "merchandiseName",
      label: "\u4ea4\u63db\u5546\u54c1",
      width: "40%",
    },
    {
      id: "usedPoint",
      label: "\u4f7f\u7528\u30dd\u30a4\u30f3\u30c8",
      align: "right",
      width: "20%",
      render: (row) => `${row.usedPoint.toLocaleString()}pt`,
    },
  ];
}

function buildExportRows(items: OverallExchangeHistoryItem[]) {
  return [
    ["\u65e5\u6642", "\u5f93\u696d\u54e1\u540d", "\u4ea4\u63db\u5546\u54c1", "\u4f7f\u7528\u30dd\u30a4\u30f3\u30c8"],
    ...items.map((item) => [formatDateTime(item.date), item.employeeName, item.merchandiseName, item.usedPoint]),
  ];
}

export default function OverallPointExchangeHistoryTable({
  items,
  startDate,
  endDate,
  rowsPerPageOptions,
  initialRowsPerPage,
}: OverallPointExchangeHistoryTableProps) {
  const columns = useMemo(() => getColumns(), []);
  const resolvedRowsPerPageOptions = useMemo(
    () => (rowsPerPageOptions?.length ? rowsPerPageOptions : [5, 10, 25, 50]),
    [rowsPerPageOptions]
  );
  const defaultRowsPerPage = useMemo(() => {
    const candidate = initialRowsPerPage ?? 5;
    return resolvedRowsPerPageOptions.includes(candidate) ? candidate : (resolvedRowsPerPageOptions[0] ?? 5);
  }, [initialRowsPerPage, resolvedRowsPerPageOptions]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const exportRows = useMemo(() => buildExportRows(items), [items]);

  useEffect(() => {
    setPage(0);
  }, [items]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(items.length / rowsPerPage) - 1);
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [items.length, page, rowsPerPage]);

  const heading = (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center">
        <FontAwesomeIcon icon={faTable} className="mr-3 text-xl text-blue-600 lg:text-2xl" />
        <div className="text-lg font-bold lg:text-2xl">{"\u30dd\u30a4\u30f3\u30c8\u4ea4\u63db\u5c65\u6b74"}</div>
      </div>
      <Button
        variant="contained"
        startIcon={<FontAwesomeIcon icon={faDownload} />}
        disabled={items.length === 0}
        onClick={() => downloadCsv(`overall-point-exchange-history-${startDate}_${endDate}.csv`, exportRows)}
        sx={{
          alignSelf: { xs: "stretch", sm: "center" },
          borderRadius: "14px",
          backgroundColor: "#475569",
          px: 2.5,
          py: 1.25,
        }}
      >
        {"\u30c7\u30fc\u30bf\u30a8\u30af\u30b9\u30dd\u30fc\u30c8"}
      </Button>
    </div>
  );

  if (items.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm">
        {heading}
        <div className="flex min-h-[220px] items-center justify-center text-sm text-slate-400">
          {"\u6307\u5b9a\u671f\u9593\u306e\u30dd\u30a4\u30f3\u30c8\u4ea4\u63db\u5c65\u6b74\u306f\u3042\u308a\u307e\u305b\u3093"}
        </div>
      </div>
    );
  }

  const displayedItems = items.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const footer = (
    <TablePagination
      component="div"
      count={items.length}
      page={page}
      onPageChange={(_event, nextPage) => setPage(nextPage)}
      rowsPerPage={rowsPerPage}
      onRowsPerPageChange={(event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
      }}
      rowsPerPageOptions={resolvedRowsPerPageOptions}
      labelRowsPerPage={"\u8868\u793a\u4ef6\u6570"}
      labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
      sx={{
        borderTop: "1px solid",
        borderColor: "grey.200",
      }}
    />
  );

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      {heading}
      <Table columns={columns} rows={displayedItems} footer={footer} />
    </div>
  );
}
