"use client";

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";

import type { MerchantUserSummary } from "../model/types";

type Props = {
  open: boolean;
  user: MerchantUserSummary | null;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: () => Promise<void>;
};

export default function ResetMerchantUserPasswordDialog({
  open,
  user,
  submitting,
  error,
  onClose,
  onSubmit,
}: Props) {
  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { borderRadius: "20px", p: 1 } } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <div className="text-xl font-bold text-slate-900">パスワードをリセット</div>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          対象ユーザーのパスワードをリセットします。リセット後はログイン画面の「パスワードを忘れた方はこちら」から再設定する必要があります。
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: "8px !important" }}>
        <Stack spacing={2.5}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          {user ? (
            <Alert severity="info" sx={{ "& .MuiAlert-message": { width: "100%" } }}>
              <div className="flex flex-col gap-1">
                <div className="font-semibold text-slate-900">
                  {user.lastName} {user.firstName}
                </div>
                <div className="text-sm text-slate-600">メールアドレス: {user.email}</div>
              </div>
            </Alert>
          ) : null}

          <Alert severity="warning">
            実行後、対象ユーザーは現在のパスワードでログインできなくなります。「パスワードを忘れた方はこちら」から新しいパスワードを設定してもらってください。
          </Alert>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ minWidth: 110 }}>
          キャンセル
        </Button>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={submitting}
          sx={{ minWidth: 110, borderRadius: "12px", backgroundColor: "#2563EB" }}
        >
          {submitting ? "リセット中..." : "リセット実行"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
