"use client";

import { useEffect, useMemo, useState } from "react";

import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { TablePagination } from "@mui/material";

import { SkeletonBlock } from "@employee/components/LoadingSkeleton";
import Table, { type ColumnDef } from "@employee/components/Table";
import { getExchangeStatusBadge } from "@correcre/merchandise-public";

import { fetchExchangeHistory } from "../api/client";
import type { ExchangeHistory as ExchangeHistoryRow } from "../model/types";

export type ExchangeHistoryProps = {
  icon: IconDefinition;
  iconColor?: string;
  className?: string;
  companyId: string;
  userId: string;
  limit?: number;
  fetchAll?: boolean;
  rowsPerPageOptions?: number[];
  initialRowsPerPage?: number;
};

export default function ExchangeHistory({
  icon,
  iconColor = "#2563EB",
  className,
  companyId,
  userId,
  limit = 10,
  fetchAll = true,
  rowsPerPageOptions,
  initialRowsPerPage,
}: ExchangeHistoryProps) {
  const columns = useMemo<ColumnDef<ExchangeHistoryRow>[]>(
    () => [
      {
        id: "date",
        label: "日付",
        width: "15%",
      },
      {
        id: "merchandiseName",
        label: "景品・サービス",
      },
      {
        id: "status",
        label: "状態",
        width: "15%",
        render: (row) => {
          const badge = getExchangeStatusBadge(row.status);
          return (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>
              {badge.label}
            </span>
          );
        },
      },
      {
        id: "usedPoint",
        label: "使用ポイント",
        width: "20%",
        align: "right",
        render: (row) => `${row.usedPoint.toLocaleString()} pt`,
      },
    ],
    [],
  );
  const resolvedRowsPerPageOptions = useMemo(
    () => (rowsPerPageOptions?.length ? rowsPerPageOptions : [5, 10, 25, 50]),
    [rowsPerPageOptions],
  );
  const defaultRowsPerPage = useMemo(() => {
    const candidate = initialRowsPerPage ?? 5;
    return resolvedRowsPerPageOptions.includes(candidate) ? candidate : (resolvedRowsPerPageOptions[0] ?? 5);
  }, [initialRowsPerPage, resolvedRowsPerPageOptions]);
  const [rows, setRows] = useState<ExchangeHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

  useEffect(() => {
    if (!companyId || !userId) {
      setRows([]);
      setLoading(false);
      return;
    }

    const ac = new AbortController();

    (async () => {
      setLoading(true);

      try {
        const data = await fetchExchangeHistory(companyId, userId, fetchAll ? undefined : limit, ac.signal);

        if (!ac.signal.aborted) {
          setRows(data);
        }
      } catch (error) {
        if (ac.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
          return;
        }

        console.error(error);
        setRows([]);
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      ac.abort();
    };
  }, [companyId, userId, limit, fetchAll]);

  useEffect(() => {
    setPage(0);
  }, [rows]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(rows.length / rowsPerPage) - 1);
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [page, rows.length, rowsPerPage]);

  const displayedRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const footer = (
    <TablePagination
      component="div"
      count={rows.length}
      page={page}
      onPageChange={(_event, nextPage) => setPage(nextPage)}
      rowsPerPage={rowsPerPage}
      onRowsPerPageChange={(event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
      }}
      rowsPerPageOptions={resolvedRowsPerPageOptions}
      labelRowsPerPage="表示件数"
      labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
      sx={{
        borderTop: "1px solid",
        borderColor: "grey.200",
      }}
    />
  );

  return (
    <div className={`mb-8 rounded-2xl bg-white p-6 shadow-lg ${className ?? ""}`}>
      <div className="mb-4 flex items-center">
        <FontAwesomeIcon icon={icon} className="mr-3 text-xl lg:text-2xl" style={{ color: iconColor }} />
        <div className="text-lg font-bold lg:text-2xl">交換履歴</div>
      </div>

      {loading ? <SkeletonBlock className="h-[320px] rounded-2xl" /> : <Table columns={columns} rows={displayedRows} footer={footer} />}
    </div>
  );
}
