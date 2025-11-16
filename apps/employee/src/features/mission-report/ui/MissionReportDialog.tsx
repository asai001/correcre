"use client";

import SuccessDialog from "@employee/features/mission-report/ui/SuccessDialog"; // 相対パスは配置に応じて調整

import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Stack, Typography, Box } from "@mui/material";
import type { Mission, SubmitPayload } from "../model/types";
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
          <>
            <DialogTitle>{missionConfig.title}</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                {/* 動的フィールド群：type ごとにレンダリング */}
                {missionConfig.fields.map((f) => {
                  if (f.type === "select") {
                    return (
                      <TextField
                        key={f.id}
                        // id を合わせることで label for の Issue を回避できる（MUIは自動採番だが安全のため）
                        id={f.id}
                        select
                        label={f.label}
                        value={values[f.id] ?? ""}
                        onChange={handleChange(f)}
                        required={f.required}
                        fullWidth
                      >
                        {(f.options ?? []).map((opt) => (
                          <MenuItem key={opt.label} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    );
                  }

                  if (f.type === "text") {
                    return (
                      <TextField
                        key={f.id}
                        id={f.id}
                        label={f.label}
                        type="text"
                        value={values[f.id] ?? ""}
                        onChange={handleChange(f)}
                        placeholder={f.placeholder}
                        fullWidth
                        required={f.required}
                      />
                    );
                  }

                  if (f.type === "textarea") {
                    return (
                      <TextField
                        key={f.id}
                        id={f.id}
                        label={f.label}
                        value={values[f.id] ?? ""}
                        onChange={handleChange(f)}
                        placeholder={f.placeholder}
                        fullWidth
                        multiline
                        minRows={f.rows ?? 3}
                        required={f.required}
                      />
                    );
                  }

                  if (f.type === "number") {
                    return (
                      <TextField
                        key={f.id}
                        id={f.id}
                        label={f.label}
                        type="number"
                        value={values[f.id] ?? ""}
                        onChange={handleChange(f)}
                        placeholder={f.placeholder}
                        fullWidth
                        required={f.required}
                      />
                    );
                  }

                  if (f.type === "datetime-local" || f.type === "date") {
                    return (
                      <TextField
                        key={f.id}
                        id={f.id}
                        label={f.label}
                        type={f.type}
                        value={values[f.id] ?? ""}
                        onChange={handleChange(f)}
                        placeholder={f.placeholder}
                        required={f.required}
                        fullWidth
                        slotProps={{
                          input: {
                            sx: {
                              // モバイル/タブレットのみ余白、PC(lg+)は0
                              py: { xs: 1.25, sm: 1.25, md: 1.25, lg: 0, xl: 0 },
                              px: { xs: 1, sm: 1, md: 1, lg: 0, xl: 0 },
                              // datetime-local の右側アイコン対策も同様に
                              pr: { xs: 1.5, sm: 1.5, md: 1.5, lg: 0, xl: 0 },
                            },
                          },
                          // ラベルが値と重ならないよう常に縮小
                          inputLabel: { shrink: true },
                        }}
                      />
                    );
                  }

                  if (f.type === "url") {
                    return (
                      <TextField
                        key={f.id}
                        id={f.id}
                        label={f.label}
                        type="url"
                        value={values[f.id] ?? ""}
                        onChange={handleChange(f)}
                        placeholder={f.placeholder}
                        fullWidth
                        required={f.required}
                      />
                    );
                  }

                  // 既定：text として扱う
                  return (
                    <TextField
                      key={f.id}
                      id={f.id}
                      label={f.label}
                      type="text"
                      value={values[f.id] ?? ""}
                      onChange={handleChange(f)}
                      placeholder={f.placeholder}
                      fullWidth
                      required={f.required}
                    />
                  );
                })}

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
              <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
                報告する
              </Button>
            </DialogActions>
          </>
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
