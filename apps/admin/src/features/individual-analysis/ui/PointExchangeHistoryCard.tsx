"use client";

import { SkeletonBlock } from "@admin/components/LoadingSkeleton";
import { faDownload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { downloadCsv } from "@admin/lib/csv";
import { Button, TablePagination } from "@mui/material";
import { useEffect, useMemo, useState } from "react";

type PointExchangeHistoryItem = {
  date: string;
  merchandiseName: string;
  usedPoint: number;
};

type PointExchangeHistoryCardProps = {
  companyId: string;
  userId: string;
  employeeName?: string;
  startDate: string;
  endDate: string;
  limit?: number;
  fetchAll?: boolean;
  rowsPerPageOptions?: number[];
  initialRowsPerPage?: number;
};

function buildExportRows(employeeName: string, items: PointExchangeHistoryItem[]) {
  return [
    ["従業員名", "交換日", "交換商品", "使用ポイント"],
    ...items.map((item) => [employeeName, item.date, item.merchandiseName, item.usedPoint]),
  ];
}

function sanitizeFilenamePart(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_").trim() || "employee";
}

async function fetchPointExchangeHistory(
  companyId: string,
  userId: string,
  startDate: string,
  endDate: string,
  limit: number | undefined,
  signal: AbortSignal
): Promise<PointExchangeHistoryItem[]> {
  const params = new URLSearchParams({
    companyId,
    userId,
    startDate,
    endDate,
  });

  if (typeof limit === "number") {
    params.set("limit", String(limit));
  }

  const res = await fetch(`/api/exchange-history?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  if (!res.ok) {
    console.error("fetchPointExchangeHistory error", res.status, await res.text());
    throw new Error("ポイント交換履歴の取得に失敗しました");
  }

  const data = (await res.json()) as PointExchangeHistoryItem[] | null;

  return data ?? [];
}

export default function PointExchangeHistoryCard({
  companyId,
  userId,
  employeeName,
  startDate,
  endDate,
  limit = 3,
  fetchAll = false,
  rowsPerPageOptions,
  initialRowsPerPage,
}: PointExchangeHistoryCardProps) {
  const [items, setItems] = useState<PointExchangeHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const resolvedRowsPerPageOptions = useMemo(
    () => (rowsPerPageOptions?.length ? rowsPerPageOptions : [3, 5, 10, 25]),
    [rowsPerPageOptions]
  );
  const defaultRowsPerPage = useMemo(() => {
    const candidate = initialRowsPerPage ?? resolvedRowsPerPageOptions[0] ?? 3;
    return resolvedRowsPerPageOptions.includes(candidate) ? candidate : (resolvedRowsPerPageOptions[0] ?? 3);
  }, [initialRowsPerPage, resolvedRowsPerPageOptions]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

  useEffect(() => {
    if (!companyId || !userId || !startDate || !endDate) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }

    const ac = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchPointExchangeHistory(
          companyId,
          userId,
          startDate,
          endDate,
          fetchAll ? undefined : limit,
          ac.signal
        );

        if (ac.signal.aborted) {
          return;
        }

        setItems(data);
      } catch (err) {
        if (ac.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }

        console.error(err);
        setError("ポイント交換履歴の取得に失敗しました");
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      ac.abort();
    };
  }, [companyId, userId, startDate, endDate, limit, fetchAll]);

  useEffect(() => {
    setPage(0);
  }, [items]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(items.length / rowsPerPage) - 1);
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [items.length, page, rowsPerPage]);

  const displayedItems = items.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const exportEmployeeName = employeeName || userId;
  const exportRows = useMemo(() => buildExportRows(exportEmployeeName, items), [exportEmployeeName, items]);
  const exportFilename = useMemo(
    () =>
      `individual-point-exchange-history-${sanitizeFilenamePart(exportEmployeeName)}-${startDate}_${endDate}.csv`,
    [endDate, exportEmployeeName, startDate]
  );

  return (
    <section className="min-h-[320px] rounded-2xl bg-white p-6 shadow-lg">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-2xl font-bold text-slate-900">{"ポイント交換履歴"}</h3>
        <Button
          variant="contained"
          startIcon={<FontAwesomeIcon icon={faDownload} />}
          disabled={loading || items.length === 0}
          onClick={() => downloadCsv(exportFilename, exportRows)}
          sx={{
            alignSelf: { xs: "stretch", sm: "center" },
            borderRadius: "14px",
            backgroundColor: "#475569",
            px: 2.5,
            py: 1.25,
          }}
        >
          {"データエクスポート"}
        </Button>
      </div>

      <div className="mt-8">
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, index) => (
              <SkeletonBlock key={index} className="h-16 rounded-2xl" />
            ))}
          </div>
        )}
        {false && loading && <div className="text-sm text-slate-400">{"読み込み中..."}</div>}

        {!loading && error && <div className="text-sm text-red-500">{error}</div>}

        {!loading && !error && items.length === 0 && (
          <div className="flex min-h-[220px] items-center justify-center text-sm text-slate-400">
            {"指定期間の交換履歴はありません"}
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="space-y-4 p-4">
              {displayedItems.map((item, index) => (
                <div
                  key={`${item.date}-${item.merchandiseName}-${page}-${index}`}
                  className="border-b border-slate-200 pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-slate-900">{item.merchandiseName}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.date}</p>
                    </div>

                    <div className="shrink-0 sm:text-right">
                      <p className="text-lg font-semibold text-red-500">-{item.usedPoint.toLocaleString()}pt</p>
                      <p className="mt-1 text-sm font-medium text-emerald-500">{"交換済み"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

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
              labelRowsPerPage={"表示件数"}
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
              sx={{
                borderTop: "1px solid",
                borderColor: "rgb(226 232 240)",
              }}
            />
          </div>
        )}
      </div>
    </section>
  );
}

