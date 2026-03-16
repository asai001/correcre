import * as React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { TablePagination } from "@mui/material";
import { toYYYYMMDDHHmm } from "@correcre/lib";
import Table, { ColumnDef } from "@admin/components/Table";
import type { RecentReport } from "../model/types";

export type RecentReportsPagination = {
  rowsPerPageOptions?: number[];
  initialRowsPerPage?: number;
};

type RecentReportsViewProps = {
  icon: IconDefinition;
  iconColor?: string;
  className?: string;
  reports: RecentReport[];
  pagination?: RecentReportsPagination;
  showEmployeeName?: boolean;
};

function getColumns(showEmployeeName: boolean): ColumnDef<RecentReport>[] {
  const columns: ColumnDef<RecentReport>[] = [
    {
      id: "date",
      label: "\u65e5\u4ed8",
      width: showEmployeeName ? "15%" : "18%",
      render: (row) => toYYYYMMDDHHmm(new Date(row.date)).replace("T", " "),
    },
  ];

  if (showEmployeeName) {
    columns.push({
      id: "name",
      label: "\u793e\u54e1\u540d",
      width: "10%",
    });
  }

  columns.push(
    {
      id: "itemName",
      label: "\u9805\u76ee\u540d",
      width: showEmployeeName ? "15%" : "18%",
    },
    {
      id: "progress",
      label: "\u9032\u6357",
      width: "10%",
    },
    {
      id: "inputContent",
      label: "\u5165\u529b\u5185\u5bb9",
      align: "left",
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
}: RecentReportsViewProps) {
  const columns = React.useMemo(() => getColumns(showEmployeeName), [showEmployeeName]);
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
      <div className="mb-4 flex items-center">
        <FontAwesomeIcon icon={icon} className="mr-3 text-xl lg:text-2xl" style={{ color: iconColor }} />
        <div className="text-lg font-bold lg:text-2xl">{"\u5831\u544a\u5185\u5bb9"}</div>
      </div>

      <Table columns={columns} rows={displayedReports} footer={footer} />
    </div>
  );
}
