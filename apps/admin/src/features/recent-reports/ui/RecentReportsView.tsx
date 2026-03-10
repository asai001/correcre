import * as React from "react";

import Table, { ColumnDef } from "@admin/components/Table";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import type { RecentReport } from "../model/types";
import { toYYYYMMDDHHmm } from "@correcre/lib";

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
      label: "日時",
      width: showEmployeeName ? "15%" : "18%",
      render: (row) => toYYYYMMDDHHmm(new Date(row.date)).replace("T", " "),
    },
  ];

  if (showEmployeeName) {
    columns.push({
      id: "name",
      label: "従業員名",
      width: "10%",
    });
  }

  columns.push(
    {
      id: "itemName",
      label: "項目名",
      width: showEmployeeName ? "15%" : "18%",
    },
    {
      id: "progress",
      label: "進捗",
      width: "10%",
    },
    {
      id: "inputContent",
      label: "入力内容",
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
    <div className={`bg-white rounded-2xl shadow-lg p-6 mb-8 ${className ?? ""}`}>
      <div className="flex items-center mb-4">
        <FontAwesomeIcon icon={icon} className="text-xl lg:text-2xl mr-3" style={{ color: iconColor }} />
        <div className="text-lg lg:text-2xl font-bold">直近の報告内容</div>
      </div>

      <Table columns={columns} rows={reports} />
    </div>
  );
}
