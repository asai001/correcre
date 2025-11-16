"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";

import { Table, type ColumnDef } from "@employee/components/Table";
import type { ExchangeHistory } from "../model/types";
import { fetchExchangeHistory } from "../api/client";

export type ExchangeHistoryProps = {
  icon: IconDefinition;
  iconColor?: string;
  className?: string;
  companyId: string;
  userId: string;
};

export default function ExchangeHistory({ icon, iconColor = "#2563EB", className, companyId, userId }: ExchangeHistoryProps) {
  const [rows, setRows] = useState<ExchangeHistory[]>([]);

  useEffect(() => {
    (async () => {
      const data = await fetchExchangeHistory(companyId, userId);
      setRows(data);
    })();
  }, [companyId, userId]);

  const columns: ColumnDef<ExchangeHistory>[] = [
    {
      id: "date",
      label: "日付",
      width: "15%",
      render: (row) => row.date, // 将来的に toYYYYMMDD などに
    },
    {
      id: "merchandiseName",
      label: "商品・サービス",
    },
    {
      id: "usedPoint",
      label: "使用ポイント",
      width: "20%",
      align: "right",
      render: (row) => `${row.usedPoint.toLocaleString()} pt`,
    },
  ];

  return (
    <div className={className}>
      <div className="flex items-center mb-4">
        <FontAwesomeIcon icon={icon} className="text-xl lg:text-2xl mr-3" style={{ color: iconColor }} />
        <div className="text-lg lg:text-2xl font-bold">直近の交換履歴</div>
      </div>

      <Table columns={columns} rows={rows} />
    </div>
  );
}
