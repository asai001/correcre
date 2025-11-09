// apps/employee/src/features/mission-report/ui/SuccessDialog.tsx
"use client";

import * as React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";

export type SuccessDialogProps = {
  /** 表示・非表示（親で制御） */
  open: boolean;
  /** 閉じる時に呼ばれる（OK クリック/Backdrop/ESC） */
  onClose: () => void;

  /** タイトル文言（既定: "送信完了"） */
  title?: React.ReactNode;
  /** 本文メッセージ（既定: "処理が正常に完了しました。"） */
  message?: React.ReactNode;

  /** 自動クローズまでのミリ秒。設定しない場合は自動クローズなし */
  autoCloseMs?: number;

  /** 自動クローズ時のコールバック（任意） */
  onAutoClose?: () => void;

  /** ダイアログの最大幅（MUIの maxWidth） */
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;

  /** OK ボタンのラベル（既定: "OK"） */
  okText?: React.ReactNode;

  /** 追加のアクション（OK の左側に並べる） */
  extraActions?: React.ReactNode;

  /** ダイアログを閉じた後もマウントを維持するか（既定: false） */
  keepMounted?: boolean;
};

export default function SuccessDialog(props: SuccessDialogProps) {
  const {
    open,
    onClose,
    title = "送信完了",
    message = "処理が正常に完了しました。",
    autoCloseMs,
    onAutoClose,
    maxWidth = "xs",
    okText = "OK",
    extraActions,
    keepMounted = false,
  } = props;

  // 自動クローズ用のタイマー管理
  React.useEffect(() => {
    if (!open) {
      return;
    }
    if (!autoCloseMs || autoCloseMs <= 0) {
      return;
    }

    const tid = setTimeout(() => {
      // 先に onAutoClose（任意の外部副作用）
      if (onAutoClose) {
        onAutoClose();
      }
      // その後に onClose で閉じる
      onClose();
    }, autoCloseMs);

    return () => {
      clearTimeout(tid);
    };
  }, [open, autoCloseMs, onAutoClose, onClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={maxWidth}
      keepMounted={keepMounted}
      // MUI v5: paperProps は非推奨。slotProps で角丸など指定
      slotProps={{
        paper: {
          sx: {
            borderRadius: 5,
          },
        },
      }}
    >
      {/* タイトル（見出し） */}
      <DialogTitle>{title}</DialogTitle>

      {/* 本文（説明） */}
      <DialogContent>
        {typeof message === "string" ? (
          <Typography variant="body1" sx={{ mt: 0.5 }}>
            {message}
          </Typography>
        ) : (
          message
        )}
      </DialogContent>

      {/* アクション（左: 追加ボタン / 右: OK） */}
      <DialogActions>
        {extraActions}
        <Button onClick={onClose} autoFocus>
          {okText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
