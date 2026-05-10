"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import type { MerchantUserSummary } from "../model/types";

type Props = {
  open: boolean;
  user: MerchantUserSummary | null;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (newEmail: string) => Promise<void>;
};

export default function ResetMerchantUserEmailDialog({
  open,
  user,
  submitting,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [newEmail, setNewEmail] = useState("");

  useEffect(() => {
    if (open) {
      setNewEmail("");
    }
  }, [open]);

  const trimmed = newEmail.trim();
  const isSameAsCurrent = user ? trimmed.toLowerCase() === user.email.toLowerCase() : false;
  const canSubmit = trimmed.length > 0 && !isSameAsCurrent && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onSubmit(trimmed);
  };

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { borderRadius: "20px", p: 1 } } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <div className="text-xl font-bold text-slate-900">メールアドレスをリセット</div>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          対象ユーザーのログイン用メールアドレスを変更します。旧メールアドレスではログインできなくなります。
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
                <div className="text-sm text-slate-600">現在のメールアドレス: {user.email}</div>
              </div>
            </Alert>
          ) : null}

          <TextField
            label="新しいメールアドレス"
            type="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            fullWidth
            required
            disabled={submitting}
            error={isSameAsCurrent}
            helperText={isSameAsCurrent ? "現在のメールアドレスと同じです" : " "}
          />

          <Alert severity="warning">
            このリセットを実行すると、対象ユーザーは旧メールアドレスではログインできなくなります。
          </Alert>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ minWidth: 110 }}>
          キャンセル
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!canSubmit}
          sx={{ minWidth: 110, borderRadius: "12px", backgroundColor: "#2563EB" }}
        >
          {submitting ? "リセット中..." : "リセット実行"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
