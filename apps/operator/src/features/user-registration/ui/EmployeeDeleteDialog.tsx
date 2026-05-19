"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material";
import type { EmployeeManagementEmployee, MutationResult } from "../model/types";

type EmployeeDeleteDialogProps = {
  open: boolean;
  employee: EmployeeManagementEmployee | null;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (userId: string) => Promise<MutationResult>;
};

export default function EmployeeDeleteDialog({
  open,
  employee,
  submitting,
  error,
  onClose,
  onSubmit,
}: EmployeeDeleteDialogProps) {
  const [confirmationUserId, setConfirmationUserId] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setConfirmationUserId("");
  }, [open, employee]);

  const isUserIdMatched = useMemo(() => {
    if (!employee) {
      return false;
    }

    return confirmationUserId.trim() === employee.userId;
  }, [confirmationUserId, employee]);

  const handleSubmit = async () => {
    if (!employee || !isUserIdMatched || submitting) {
      return;
    }

    await onSubmit(employee.userId);
  };

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: "24px",
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <div className="text-2xl font-bold text-slate-900">DELETE ステータスへ変更</div>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          誤操作防止のため、対象のユーザーIDを入力した場合のみ DELETE ステータスへの変更を実行できます。
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: "8px !important" }}>
        <div className="space-y-4">
          <Alert severity="warning">
            この操作を行うと対象ユーザーは DELETE 扱いになります。退職者など運用上残したいが利用停止したいユーザーにのみ使用してください。対象は「{employee?.name ?? "-"}」です。
          </Alert>

          {error && <Alert severity="error">{error}</Alert>}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-sm text-slate-500">対象ユーザーID</div>
            <div className="mt-2 font-mono text-lg font-semibold text-slate-900">{employee?.userId ?? "-"}</div>
          </div>

          <TextField
            label="ユーザーIDを入力"
            placeholder={employee?.userId ?? ""}
            value={confirmationUserId}
            onChange={(event) => setConfirmationUserId(event.target.value)}
            fullWidth
            helperText={
              isUserIdMatched
                ? "ユーザーIDが一致しました。DELETE ステータスへの変更を実行できます。"
                : "上に表示されているユーザーIDを正確に入力してください。"
            }
          />
        </div>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ minWidth: 110 }}>
          キャンセル
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!isUserIdMatched || submitting}
          sx={{
            minWidth: 110,
            borderRadius: "12px",
            backgroundColor: "#EF4444",
            "&:hover": {
              backgroundColor: "#DC2626",
            },
          }}
        >
          {submitting ? "変更中..." : "DELETE に変更"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
