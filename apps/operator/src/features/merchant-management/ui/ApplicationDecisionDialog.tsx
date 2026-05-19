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

import type { MerchantApplicationDetail } from "../model/types";

type Decision = "approve" | "reject";

type Props = {
  open: boolean;
  decision: Decision;
  application: MerchantApplicationDetail | null;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: () => Promise<void>;
};

export default function ApplicationDecisionDialog({
  open,
  decision,
  application,
  submitting,
  error,
  onClose,
  onSubmit,
}: Props) {
  const isApprove = decision === "approve";
  const title = isApprove ? "提携企業申請を承認" : "提携企業申請を却下";
  const description = isApprove
    ? "この申請を承認すると、ログインアカウントが作成され、担当者メールアドレスに仮パスワード付きの招待メールが送信されます。"
    : "この申請を却下すると、提携企業ステータスが REJECTED になり、申請者は登録できなくなります。";
  const confirmLabel = isApprove ? "承認する" : "却下する";
  const buttonColor = isApprove ? "#2563EB" : "#dc2626";

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { borderRadius: "20px", p: 1 } } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <div className="text-xl font-bold text-slate-900">{title}</div>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {description}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: "8px !important" }}>
        <Stack spacing={2.5}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          {application ? (
            <Alert severity="info" sx={{ "& .MuiAlert-message": { width: "100%" } }}>
              <div className="flex flex-col gap-1.5">
                <div className="font-semibold text-slate-900">{application.merchant.name}</div>
                <div className="text-sm text-slate-600">merchantId: {application.merchant.merchantId}</div>
                {application.contactUser ? (
                  <>
                    <div className="text-sm text-slate-700">
                      担当者: {application.contactUser.lastName} {application.contactUser.firstName}
                    </div>
                    <div className="text-sm text-slate-700">メアド: {application.contactUser.email}</div>
                  </>
                ) : null}
              </div>
            </Alert>
          ) : null}
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
          sx={{ minWidth: 110, borderRadius: "12px", backgroundColor: buttonColor }}
        >
          {submitting ? "処理中..." : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
