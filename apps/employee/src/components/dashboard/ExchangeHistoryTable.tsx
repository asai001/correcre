import * as React from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/free-solid-svg-icons";

function createData(date: string, merchandiseName: string, usedPoint: number) {
  return { date, merchandiseName, usedPoint };
}

const rows = [
  createData("2025-10-25", "幾重 プレミアム シャンプー＆トリートメント 500ml セット", 1600),
  createData("2025-10-25", "ダイヤモンドライス 5kg", 3000),
  createData("2025-10-25", "秀吉のごほうび「生」くりーむぱん　6個入り", 830),
];

type ExchangeHistoryTableProps = {
  icon: IconDefinition;
  iconColor?: string; // "blue" | "#2563EB" など
  className?: string;
};

export default function ExchangeHistoryTable({ icon, iconColor = "#2563EB", className }: ExchangeHistoryTableProps) {
  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 mb-8 ${className ?? ""}`}>
      <div className="flex items-center mb-4">
        <FontAwesomeIcon icon={icon} className="text-xl lg:text-2xl mr-3" style={{ color: iconColor }} />
        <div className="text-lg lg:text-2xl font-bold">直近の交換履歴</div>
      </div>

      <TableContainer
        component={Paper}
        sx={{
          border: "1px solid",
          borderColor: "grey.200",
          borderRadius: 2,
          overflow: "auto", // モバイルで横スクロール可
        }}
      >
        <Table
          sx={{
            "& th, & td": { borderColor: "grey.200" },
            minWidth: 680, // 狭い画面でのカラム潰れ防止
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell style={{ width: "15%" }}>日付</TableCell>
              <TableCell>商品・サービス</TableCell>
              <TableCell style={{ width: "20%" }} align="right">
                使用ポイント
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                <TableCell sx={{ whiteSpace: "nowrap" }} component="th" scope="row">
                  {row.date}
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }} component="th" scope="row">
                  {row.merchandiseName}
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: "nowrap" }} component="th" scope="row">
                  {row.usedPoint.toLocaleString()} pt
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
