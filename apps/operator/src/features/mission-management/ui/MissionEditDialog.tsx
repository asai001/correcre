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

import type { MissionField } from "@correcre/types";
import { updateMission } from "../api/client";
import type { OperatorMissionSummary, UpdateMissionInput } from "../model/types";
import FieldBuilder from "./FieldBuilder";

type MissionEditDialogProps = {
  open: boolean;
  companyId: string;
  mission: OperatorMissionSummary;
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

export default function MissionEditDialog({
  open,
  companyId,
  mission,
  onClose,
  onUpdated,
}: MissionEditDialogProps) {
  const isNewMission = !mission.configured;
  const [form, setForm] = useState<FormState>(() => initFormState(mission));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    setForm(initFormState(mission));
    setError(null);
    setConfirmOpen(false);
  }, [mission]);

  const handleSave = () => {
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);

    const input: UpdateMissionInput = {
      title: form.title,
      description: form.description,
      category: form.category,
      monthlyCount: parseInt(form.monthlyCount, 10),
      score: parseInt(form.score, 10),
      enabled: form.enabled,
      fields: form.fields,
    };

    try {
      setSubmitting(true);
      setError(null);
      const updated = await updateMission(companyId, mission.slotIndex, input);
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
                    onChange={(e) => setForm((c) => ({ ...c, monthlyCount: e.target.value }))}
                    fullWidth
                    required
                    sx={floatingLabelTextFieldSx}
                  />
                </div>
                <div className="pt-2">
                  <TextField
                    label="スコア"
                    type="number"
                    value={form.score}
                    onChange={(e) => setForm((c) => ({ ...c, score: e.target.value }))}
                    fullWidth
                    required
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
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={submitting}
            sx={{
              borderRadius: "12px",
              backgroundColor: "#0f766e",
              "&:hover": { backgroundColor: "#115e59" },
            }}
          >
            {submitting ? "保存中..." : isNewMission ? "登録" : "保存"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 確認ダイアログ */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        PaperProps={{ sx: { borderRadius: "20px" } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>{isNewMission ? "登録内容の確認" : "編集内容の確認"}</DialogTitle>
        <DialogContent>
          <p className="text-sm text-slate-600">
            {isNewMission
              ? `スロット ${mission.slotIndex} にミッション「${form.title}」を登録します。初版（v1）が作成されます。`
              : `ミッション「${form.title}」を更新します。新しいバージョン（v${mission.version + 1}）が作成され、現在のバージョンは履歴に保存されます。`}
            この操作は取り消せません。
          </p>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setConfirmOpen(false)}>キャンセル</Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            sx={{
              borderRadius: "12px",
              backgroundColor: "#0f766e",
              "&:hover": { backgroundColor: "#115e59" },
            }}
          >
            {isNewMission ? "登録する" : "更新する"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
