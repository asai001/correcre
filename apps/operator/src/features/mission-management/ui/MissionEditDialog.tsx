"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  TextField,
} from "@mui/material";

import { nextMonthYYYYMM, nowYYYYMM } from "@correcre/lib";
import type { MissionField } from "@correcre/types";
import { updateMission } from "../api/client";
import { MISSION_TOTAL_POINTS_CAP } from "../model/types";
import type { MissionApplyMode, OperatorMissionSummary, UpdateMissionInput } from "../model/types";
import { validateMissionInput } from "../model/validation";
import FieldBuilder from "./FieldBuilder";

type MissionEditDialogProps = {
  open: boolean;
  companyId: string;
  mission: OperatorMissionSummary;
  // 編集中のスロットを除いた、有効なミッションの「月間実施回数 × 点数」の合計。
  otherMissionsTotalPoints: number;
  onClose: () => void;
  onUpdated: (mission: OperatorMissionSummary) => void;
};

type FormState = {
  title: string;
  description: string;
  category: string;
  monthlyCount: string;
  score: string;
  enabled: boolean;
  fields: MissionField[];
};

function initFormState(mission: OperatorMissionSummary): FormState {
  return {
    title: mission.title,
    description: mission.description,
    category: mission.category,
    monthlyCount: String(mission.monthlyCount),
    score: String(mission.score),
    enabled: mission.enabled,
    fields: mission.fields.map((f) => ({ ...f })),
  };
}

const floatingLabelTextFieldSx = {
  "& .MuiInputLabel-root": {
    backgroundColor: "#fff",
    px: 0.5,
  },
};

function toIntegerFormValue(value: string) {
  return /^\d*$/.test(value) ? value : null;
}

export default function MissionEditDialog({
  open,
  companyId,
  mission,
  otherMissionsTotalPoints,
  onClose,
  onUpdated,
}: MissionEditDialogProps) {
  const isNewMission = !mission.configured;
  const [form, setForm] = useState<FormState>(() => initFormState(mission));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 確認ダイアログで反映モードを保持（null = 未確認）。
  const [pendingMode, setPendingMode] = useState<MissionApplyMode | null>(null);
  // 予約反映の対象月（翌月 YYYY-MM）。表示・確認文言に使う。
  const scheduledYearMonth = nextMonthYYYYMM(nowYYYYMM());

  useEffect(() => {
    setForm(initFormState(mission));
    setError(null);
    setPendingMode(null);
  }, [mission]);

  const buildInput = (): UpdateMissionInput => ({
    title: form.title,
    description: form.description,
    category: form.category,
    monthlyCount: Number(form.monthlyCount),
    score: Number(form.score),
    enabled: form.enabled,
    fields: form.fields,
  });

  const handleSave = (mode: MissionApplyMode) => {
    const nextInput = buildInput();
    const validationError = validateMissionInput(nextInput);

    if (validationError) {
      setError(validationError);
      return;
    }

    // 有効な全ミッションの「月間実施回数 × 点数」の合計が上限を超えないかをチェックする。
    const editedMissionPoints = nextInput.enabled ? nextInput.monthlyCount * nextInput.score : 0;
    const projectedTotalPoints = otherMissionsTotalPoints + editedMissionPoints;

    if (projectedTotalPoints > MISSION_TOTAL_POINTS_CAP) {
      setError(
        `全ミッションの「月間実施回数 × 点数」の合計が ${MISSION_TOTAL_POINTS_CAP} 点を超えています（この設定では合計 ${projectedTotalPoints} 点）。`,
      );
      return;
    }

    setError(null);
    setPendingMode(mode);
  };

  const handleConfirm = async () => {
    const mode = pendingMode ?? "immediate";
    setPendingMode(null);

    try {
      setSubmitting(true);
      setError(null);
      const updated = await updateMission(companyId, mission.slotIndex, buildInput(), mode);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ミッションの保存に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={submitting ? undefined : onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: "24px" } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {isNewMission
            ? `ミッション新規設定 — スロット ${mission.slotIndex}`
            : `ミッション編集 — スロット ${mission.slotIndex}（v${mission.version}）`}
        </DialogTitle>
        <DialogContent dividers>
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          ) : null}

          <div className="space-y-4">
            <div className="space-y-6">
              <div className="pt-2">
                <TextField
                  label="タイトル"
                  value={form.title}
                  onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
                  fullWidth
                  required
                  sx={floatingLabelTextFieldSx}
                />
              </div>
              <div className="pt-2">
                <TextField
                  label="説明"
                  value={form.description}
                  onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
                  fullWidth
                  multiline
                  rows={3}
                  required
                  sx={floatingLabelTextFieldSx}
                />
              </div>
              <div className="grid gap-x-4 gap-y-6 md:grid-cols-3">
                <div className="pt-2">
                  <TextField
                    label="カテゴリ"
                    value={form.category}
                    onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))}
                    fullWidth
                    required
                    sx={floatingLabelTextFieldSx}
                  />
                </div>
                <div className="pt-2">
                  <TextField
                    label="月間実施回数"
                    type="number"
                    value={form.monthlyCount}
                    onChange={(e) => {
                      const nextValue = toIntegerFormValue(e.target.value);
                      if (nextValue !== null) {
                        setForm((c) => ({ ...c, monthlyCount: nextValue }));
                      }
                    }}
                    fullWidth
                    required
                    slotProps={{
                      htmlInput: {
                        min: 1,
                        step: 1,
                        inputMode: "numeric",
                        pattern: "[0-9]*",
                      },
                    }}
                    sx={floatingLabelTextFieldSx}
                  />
                </div>
                <div className="pt-2">
                  <TextField
                    label="点数"
                    type="number"
                    value={form.score}
                    onChange={(e) => {
                      const nextValue = toIntegerFormValue(e.target.value);
                      if (nextValue !== null) {
                        setForm((c) => ({ ...c, score: nextValue }));
                      }
                    }}
                    fullWidth
                    required
                    slotProps={{
                      htmlInput: {
                        min: 1,
                        step: 1,
                        inputMode: "numeric",
                        pattern: "[0-9]*",
                      },
                    }}
                    sx={floatingLabelTextFieldSx}
                  />
                </div>
              </div>
            </div>

            <FormControlLabel
              control={
                <Checkbox
                  checked={form.enabled}
                  onChange={(e) => setForm((c) => ({ ...c, enabled: e.target.checked }))}
                />
              }
              label="有効"
            />

            <FieldBuilder
              fields={form.fields}
              onChange={(fields) => setForm((c) => ({ ...c, fields }))}
            />
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={submitting}>
            キャンセル
          </Button>
          {isNewMission ? (
            <Button
              variant="contained"
              onClick={() => handleSave("immediate")}
              disabled={submitting}
              sx={{
                borderRadius: "12px",
                backgroundColor: "#0f766e",
                "&:hover": { backgroundColor: "#115e59" },
              }}
            >
              {submitting ? "保存中..." : "登録"}
            </Button>
          ) : (
            <>
              <Button
                variant="outlined"
                onClick={() => handleSave("scheduled")}
                disabled={submitting}
                sx={{
                  borderRadius: "12px",
                  color: "#0f766e",
                  borderColor: "#0f766e",
                  "&:hover": { borderColor: "#115e59", backgroundColor: "rgba(15,118,110,0.04)" },
                }}
              >
                翌月月初から反映
              </Button>
              <Button
                variant="contained"
                onClick={() => handleSave("immediate")}
                disabled={submitting}
                sx={{
                  borderRadius: "12px",
                  backgroundColor: "#0f766e",
                  "&:hover": { backgroundColor: "#115e59" },
                }}
              >
                {submitting ? "保存中..." : "即時反映"}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* 確認ダイアログ */}
      <Dialog
        open={pendingMode !== null}
        onClose={() => setPendingMode(null)}
        PaperProps={{ sx: { borderRadius: "20px" } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {pendingMode === "scheduled" ? "翌月反映の確認" : isNewMission ? "登録内容の確認" : "即時反映の確認"}
        </DialogTitle>
        <DialogContent>
          <p className="text-sm text-slate-600">
            {pendingMode === "scheduled"
              ? `ミッション「${form.title}」の編集内容を ${scheduledYearMonth} の月初（00:00）から自動反映するよう予約します。現在の内容は変わりません。反映時に新しいバージョンが作成されます。予約は「即時反映」または「予約取消」で上書き・取り消しできます。`
              : isNewMission
                ? `スロット ${mission.slotIndex} にミッション「${form.title}」を登録します。初版（v1）が作成されます。この操作は取り消せません。`
                : `ミッション「${form.title}」を今すぐ更新します。新しいバージョン（v${mission.version + 1}）が作成され、現在のバージョンは履歴に保存されます。予約中の翌月反映があれば取り消されます。この操作は取り消せません。`}
          </p>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setPendingMode(null)}>キャンセル</Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            sx={{
              borderRadius: "12px",
              backgroundColor: "#0f766e",
              "&:hover": { backgroundColor: "#115e59" },
            }}
          >
            {pendingMode === "scheduled" ? "予約する" : isNewMission ? "登録する" : "即時反映する"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
