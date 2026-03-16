import * as React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { toYYYYMMDDHHmm } from "@correcre/lib";
import Table, { ColumnDef } from "@admin/components/Table";
import type { RecentReport } from "../model/types";

type RecentReportsViewProps = {
  icon: IconDefinition;
  iconColor?: string;
  className?: string;
  reports: RecentReport[];
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
  showEmployeeName = true,
}: RecentReportsViewProps) {
  const columns = React.useMemo(() => getColumns(showEmployeeName), [showEmployeeName]);

  return (
    <div className={`mb-8 rounded-2xl bg-white p-6 shadow-lg ${className ?? ""}`}>
      <div className="mb-4 flex items-center">
        <FontAwesomeIcon icon={icon} className="mr-3 text-xl lg:text-2xl" style={{ color: iconColor }} />
        <div className="text-lg font-bold lg:text-2xl">{"\u5831\u544a\u5185\u5bb9"}</div>
      </div>

      <Table columns={columns} rows={reports} />
    </div>
  );
}
