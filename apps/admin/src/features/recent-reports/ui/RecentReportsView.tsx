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
import type { RecentReport } from "../model/types";

type RecentReportsViewProps = {
  icon: IconDefinition;
  iconColor?: string;
  className?: string;
  reports: RecentReport[];
};

export default function RecentReportsView({ icon, iconColor = "#2563EB", className, reports }: RecentReportsViewProps) {
  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 mb-8 ${className ?? ""}`}>
      <div className="flex items-center mb-4">
        <FontAwesomeIcon icon={icon} className="text-xl lg:text-2xl mr-3" style={{ color: iconColor }} />
        <div className="text-lg lg:text-2xl font-bold">直近の報告内容</div>
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
            "& th, & td": { textAlign: "left", borderColor: "grey.200" }, // ここで全セル左揃え
            minWidth: 680, // 狭い画面でのカラム潰れ防止
          }}
        >
          {/* 列幅の指示：1,2列は最小・3列目が残り全部 */}
          <colgroup>
            <col style={{ width: "1%" }} />
            <col style={{ width: "1%" }} />
            <col style={{ width: "1%" }} />
            <col />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableCell>日時</TableCell>
              <TableCell>従業員名</TableCell>
              <TableCell align="right">項目名</TableCell>
              <TableCell align="right">進捗</TableCell>
              <TableCell align="right">入力内容</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reports.map((row, index) => (
              <TableRow key={`${row.name}-${index}`} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                <TableCell sx={{ whiteSpace: "nowrap" }} component="th" scope="row">
                  {row.date}
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }} component="th" scope="row">
                  {row.name}
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }} align="right">
                  {row.itemName}
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }} align="right">
                  {row.progress}
                </TableCell>
                <TableCell
                  sx={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    lineHeight: 1.6,
                  }}
                  align="right"
                >
                  {row.inputContent}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
