"use client";

import { faTable } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Table, { type ColumnDef } from "@admin/components/Table";
import { toYYYYMMDDHHmm } from "@correcre/lib";
import { TablePagination } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import type { OverallExchangeHistoryItem } from "../model/types";

type OverallPointExchangeHistoryTableProps = {
  items: OverallExchangeHistoryItem[];
  rowsPerPageOptions?: number[];
  initialRowsPerPage?: number;
};

function getColumns(): ColumnDef<OverallExchangeHistoryItem>[] {
  return [
    {
      id: "date",
      label: "\u65e5\u6642",
      width: "20%",
      render: (row) => toYYYYMMDDHHmm(new Date(row.date)).replace("T", " "),
    },
    {
      id: "employeeName",
      label: "\u5f93\u696d\u54e1\u540d",
      width: "16%",
    },
    {
      id: "merchandiseName",
      label: "\u4ea4\u63db\u5546\u54c1",
      width: "32%",
    },
    {
      id: "usedPoint",
      label: "\u4f7f\u7528\u30dd\u30a4\u30f3\u30c8",
      align: "right",
      width: "14%",
      render: (row) => `${row.usedPoint.toLocaleString()}pt`,
    },
    {
      id: "status",
      label: "\u30b9\u30c6\u30fc\u30bf\u30b9",
      align: "center",
      width: "12%",
      render: (row) => (
        <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          {row.status}
        </span>
      ),
    },
  ];
}

export default function OverallPointExchangeHistoryTable({
  items,
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
    <div className="mb-4 flex items-center">
      <FontAwesomeIcon icon={faTable} className="mr-3 text-xl text-blue-600 lg:text-2xl" />
      <div className="text-lg font-bold lg:text-2xl">{"\u30dd\u30a4\u30f3\u30c8\u4ea4\u63db\u5c65\u6b74"}</div>
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
