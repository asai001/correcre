"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack, Typography, Box, MenuItem } from "@mui/material";

import SuccessDialog from "@employee/features/mission-report/ui/SuccessDialog";
import { fetchMissionFormConfig } from "../api/client";
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
  const [resolvedMissionConfig, setResolvedMissionConfig] = useState<Mission>(missionConfig);
  const [configLoading, setConfigLoading] = useState(false);

  useEffect(() => {
    setResolvedMissionConfig(missionConfig);
  }, [missionConfig]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    (async () => {
      setConfigLoading(true);

      try {
        const formConfig = await fetchMissionFormConfig(companyId, missionId ?? missionConfig.missionId);

        if (cancelled || !formConfig) {
          return;
        }

        setResolvedMissionConfig((current) => ({
          ...current,
          missionId: formConfig.missionId,
          version: formConfig.version,
          title: formConfig.title,
          fields: formConfig.fields,
          score: formConfig.points,
          monthlyCount: formConfig.monthlyCount,
          order: formConfig.order,
          enabled: formConfig.enabled,
        }));
      } catch (fetchError) {
        console.error("failed to refresh mission form config", fetchError);
      } finally {
        if (!cancelled) {
          setConfigLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, companyId, missionId, missionConfig.missionId]);

  const { values, submitting, error, successOpen, successMessage, setSuccessOpen, handleChange, handleSubmit } = useMissionReportDialog({
    companyId,
    missionId,
    missionConfig: resolvedMissionConfig,
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
    const value = values[field.id] ?? "";

    // 共通 props
    const commonProps = {
      fullWidth: true,
      margin: "normal" as const,
      id: field.id,
      name: field.id,
      label: field.label,
      placeholder: field.placeholder,
      helperText: field.helpText,
      required: field.required,
    };

    if (field.type === "textarea") {
      return (
        <TextField
          key={field.id}
          {...commonProps}
          multiline
          rows={field.rows ?? 4}
          value={value}
          onChange={handleChange(field)}
        />
      );
    }

    if (field.type === "select") {
      return (
        <TextField
          key={field.id}
          {...commonProps}
          select
          value={value}
          onChange={handleChange(field)}
        >
          {!field.required ? (
            <MenuItem value="">未選択</MenuItem>
          ) : null}
          {field.options?.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      );
    }

    if (field.type === "number") {
      return (
        <TextField
          key={field.id}
          {...commonProps}
          type="number"
          value={value}
          onChange={handleChange(field)}
          slotProps={{
            input: {
              inputProps: {
                min: field.min,
                max: field.max,
                step: field.step,
              },
            },
          }}
        />
      );
    }

    if (field.type === "date" || field.type === "datetime-local") {
      return (
        <TextField
          key={field.id}
          {...commonProps}
          type={field.type}
          value={value}
          onChange={handleChange(field)}
          slotProps={{
            inputLabel: { shrink: true },
          }}
        />
      );
    }

    // 他のタイプ（text / url など）
    return <TextField key={field.id} {...commonProps} value={value} onChange={handleChange(field)} />;
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
            <DialogTitle>{resolvedMissionConfig.title}</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                {configLoading ? (
                  <Typography variant="body2" color="text.secondary">
                    最新のフォーム設定を読み込み中...
                  </Typography>
                ) : null}
                {resolvedMissionConfig.fields.map((f) => renderField(f))}

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
                    {resolvedMissionConfig.score}点
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
        onClose={() => {
          setSuccessOpen(false);
          onClose();
        }}
        title="送信完了"
        message={successMessage}
        autoCloseMs={0} // 自動クローズしないなら 0/未指定。自動で閉じたければ 1500 など
        maxWidth="xs"
      />
    </>
  );
}
