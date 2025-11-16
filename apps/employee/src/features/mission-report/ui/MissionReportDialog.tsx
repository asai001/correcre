"use client";

import type { FormEvent } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Stack, Typography, Box } from "@mui/material";

import SuccessDialog from "@employee/features/mission-report/ui/SuccessDialog";
import type { Mission, SubmitPayload, FieldConfig } from "../model/types";
import { useMissionReportDialog } from "../hooks/useMissionReportDialog";

type MissionReportDialogProps = {
  /** ダイアログの開閉制御（アンマウントはせず open で出し入れ推奨） */
  open: boolean;
  /** キャンセル/送信成功時のクローズハンドラ（親で open=false にする） */
  onClose: () => void;
  /** 送信処理（API連携など）。成功したら onClose まで行う */
  onSubmit: (payload: SubmitPayload) => void | Promise<void>;
  /** 会社ID（SSO/JWT等から取得予定） */
  companyId: string;
  /** 報告対象のミッションID（未選択の瞬間があるため optional） */
  missionId?: string;
  missionConfig: Mission;
};

export default function MissionReportDialog({ open, onClose, onSubmit, companyId, missionId, missionConfig }: MissionReportDialogProps) {
  const { values, submitting, error, successOpen, successMessage, setSuccessOpen, handleChange, handleSubmit } = useMissionReportDialog({
    companyId,
    missionId,
    missionConfig,
    onSubmit,
    onClose,
  });

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // 自動でページリロードされないようにする

    const form = event.currentTarget;

    // ネイティブバリデーションを発火（エラーがあればブラウザの吹き出しが出る）
    if (!form.reportValidity()) {
      return;
    }

    // ここまで来たら全項目 OK なので、既存の送信ロジックを呼ぶ
    await handleSubmit();
  };

  const renderField = (field: FieldConfig) => {
    const isTextarea = field.type === "textarea";
    const isSelect = field.type === "select";
    const isDateLike = field.type === "date" || field.type === "datetime-local";
    const placeholder = field.placeholder; // そのまま使う（undefined なら渡さない）

    const commonProps = {
      label: field.label,
      fullWidth: true,
      margin: "normal" as const,
      required: field.required ?? false,
      value: (values[field.id] ?? "") as string,
      onChange: handleChange(field),
      // textarea / select 以外は type に field.type をそのまま使う
      ...(isTextarea || isSelect ? {} : { type: field.type }),
      // placeholder は select 以外にそのまま
      ...(isSelect ? {} : placeholder ? { placeholder } : {}),
      // ★ date / datetime-local のときだけラベルを強制 shrink
      ...(isDateLike
        ? {
            slotProps: {
              inputLabel: { shrink: true },
            },
          }
        : {}),
    };

    if (isTextarea) {
      return <TextField key={field.id} {...commonProps} multiline rows={field.rows ?? 3} />;
    }

    if (isSelect) {
      return (
        <TextField key={field.id} {...commonProps} select>
          <MenuItem value="">
            <em>選択してください</em>
          </MenuItem>
          {(field.options ?? []).map((opt) => (
            <MenuItem key={opt.label} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      );
    }

    // 通常の input 系 (text, number, date, datetime-local など) はそのまま field.type を使う
    return <TextField key={field.id} {...commonProps} />;
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        // paperProps は非推奨のため slotProps.paper.sx を使用
        slotProps={{
          paper: {
            sx: {
              borderRadius: 5,
            },
          },
        }}
      >
        {!missionConfig ? (
          <>
            <DialogTitle>フォーム未設定</DialogTitle>
            <DialogContent>このミッションの報告フォームが未設定です。管理者に連絡してください。</DialogContent>
            <DialogActions>
              <Button onClick={onClose}>閉じる</Button>
            </DialogActions>
          </>
        ) : (
          <Box component="form" onSubmit={handleFormSubmit}>
            <DialogTitle>{missionConfig.title}</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                {missionConfig.fields.map((f) => renderField(f))}

                {/* Points 表示（左右に振り分け、丸角の背景で視認性UP） */}
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: "action.hover",
                    borderRadius: 3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography component="span">獲得点数</Typography>
                  <Typography component="span" fontWeight="bold">
                    {missionConfig.score}点
                  </Typography>
                </Box>

                {/* 送信エラー時のメッセージ（軽量） */}
                {error && (
                  <Typography variant="body2" color="error">
                    {error}
                  </Typography>
                )}
              </Stack>
            </DialogContent>

            <DialogActions>
              <Button onClick={onClose} disabled={submitting}>
                キャンセル
              </Button>
              <Button type="submit" variant="contained" disabled={submitting}>
                報告する
              </Button>
            </DialogActions>
          </Box>
        )}
      </Dialog>

      <SuccessDialog
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title="送信完了"
        message={successMessage}
        autoCloseMs={0} // 自動クローズしないなら 0/未指定。自動で閉じたければ 1500 など
        maxWidth="xs"
      />
    </>
  );
}
