"use client";

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import type { Mission } from "../model/types";

type MissionListDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missions: Mission[];
};

function getFieldSummary(mission: Mission) {
  const labels = mission.fields
    .map((field) => field.label.trim())
    .filter((label) => label.length > 0);

  return labels.length > 0 ? labels.join(" / ") : "フォーム未設定";
}

export default function MissionListDialog({ open, onOpenChange, missions }: MissionListDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      fullWidth
      maxWidth="lg"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
          },
        },
      }}
    >
      <DialogTitle>ミッション一覧</DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {missions.length === 0 ? (
          <Box sx={{ px: 3, py: 5 }}>
            <Typography color="text.secondary">表示できるミッションがありません。</Typography>
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: "70vh" }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 180 }}>ミッション</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>カテゴリ</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>スコア</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>月間実施回数</TableCell>
                  <TableCell sx={{ minWidth: 240 }}>説明</TableCell>
                  <TableCell sx={{ minWidth: 260 }}>報告項目</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {missions.map((mission) => (
                  <TableRow key={mission.missionId} hover>
                    <TableCell sx={{ fontWeight: 600, color: "text.primary" }}>{mission.title}</TableCell>
                    <TableCell>{mission.category}</TableCell>
                    <TableCell>{mission.score}点</TableCell>
                    <TableCell>{mission.monthlyCount}回</TableCell>
                    <TableCell>{mission.description}</TableCell>
                    <TableCell>{getFieldSummary(mission)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={() => onOpenChange(false)}>閉じる</Button>
      </DialogActions>
    </Dialog>
  );
}
