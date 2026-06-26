"use client";

import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import type { EmployeeManagementEmployee } from "../model/types";

type EmployeeResendInvitationDialogProps = {
  open: boolean;
  employee: EmployeeManagementEmployee | null;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (userId: string) => Promise<void>;
};

export default function EmployeeResendInvitationDialog({
  open,
  employee,
  submitting,
  error,
  onClose,
  onSubmit,
}: EmployeeResendInvitationDialogProps) {
  const handleSubmit = async () => {
    if (!employee || submitting) {
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
        <div className="text-2xl font-bold text-slate-900">招待メールを再送</div>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          仮パスワードの有効期限が切れた招待中ユーザーへ、新しい仮パスワードを記載した招待メールを再送します。
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: "8px !important" }}>
        <div className="space-y-4">
          <Alert severity="info">
            「{employee?.name ?? "-"}」（{employee?.email ?? "-"}）宛に新しい仮パスワードを送信します。これまでの仮パスワードは無効になります。
          </Alert>

          {error && <Alert severity="error">{error}</Alert>}
        </div>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ minWidth: 110 }}>
          キャンセル
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
          sx={{
            minWidth: 110,
            borderRadius: "12px",
            backgroundColor: "#3B82F6",
            "&:hover": {
              backgroundColor: "#2563EB",
            },
          }}
        >
          {submitting ? "送信中..." : "再送する"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
