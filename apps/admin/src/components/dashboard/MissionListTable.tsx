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

function createData(date: string, name: string, itemName: string, progress: string, inputContent: string) {
  return { date, name, itemName, progress, inputContent };
}

const rows = [
  createData("2025-10-25 11:00:00", "田中 太郎", "挨拶運動", "5/20", ["参加申告：始業前・昼・退勤時に実施（計3回）"].join("\n")),
  createData(
    "2025-10-25 11:00:00",
    "山田 太郎",
    "健康推進活動",
    "5/20",
    ["実施内容：ウォーキング平均 8,200 歩/日（雨天はストレッチ）"].join("\n")
  ),
  createData(
    "2025-10-25 11:00:00",
    "斎藤 太郎",
    "自己研鑽・成長",
    "5/20",
    [
      "参考資料名：『リーダブルコード』",
      "学習内容：関数命名・早期return・コメント指針",
      "どう活かすか：PRテンプレにチェック項目を追加",
    ].join("\n")
  ),
  createData(
    "2025-10-25 11:00:00",
    "加藤 太郎",
    "効率化・改善提案",
    "5/20",
    ["提案内容：勤怠集計の自動化（GAS）", "期待される効果：集計工数 月30分→5分、入力ミス削減"].join("\n")
  ),
  createData(
    "2025-10-25 11:00:00",
    "藤田 花子",
    "地域活動",
    "5/20",
    ["日時：2025-09-21 10:00-12:00", "参加活動：駅前〜公園の清掃", "感想：地域の方から感謝の言葉を頂いた"].join("\n")
  ),
];

type MissionListTableProps = {
  icon: IconDefinition;
  iconColor?: string; // "blue" | "#2563EB" など
  className?: string;
};

export default function MissionListTable({ icon, iconColor = "#2563EB", className }: MissionListTableProps) {
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
            <col style={{ width: "1%" }} /> {/* 従業員名 */}
            <col style={{ width: "1%" }} /> {/* 従業員名 */}
            <col style={{ width: "1%" }} /> {/* 項目名 */}
            <col /> {/* 入力内容（残りをすべて） */}
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
            {rows.map((row) => (
              <TableRow key={row.name} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
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
