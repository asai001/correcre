"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";

import type { OperatorCompanySummary, UpdateCompanyInput } from "../model/types";
import CompanyPhilosophyFields from "./CompanyPhilosophyFields";
import {
  createEmptyCompanyPhilosophyItem,
  createCompanyFormStateFromCompany,
  getCompanyFormState,
  hasCompanyFormError,
  planOptions,
  statusOptions,
  toUpdateCompanyInput,
  type CompanyFormState,
} from "./company-form";

type CompanyEditDialogProps = {
  open: boolean;
  company: OperatorCompanySummary | null;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: UpdateCompanyInput) => Promise<void>;
};

export default function CompanyEditDialog({
  open,
  company,
  submitting,
  error,
  onClose,
  onSubmit,
}: CompanyEditDialogProps) {
  const [form, setForm] = useState<CompanyFormState>(() => createCompanyFormStateFromCompany(company));
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(createCompanyFormStateFromCompany(company));
    setHasSubmitted(false);
  }, [company, open]);

  const { parsedMonthlyFee, parsedCompanyPointBalance, validation } = useMemo(
    () => getCompanyFormState(form),
    [form],
  );
  const hasValidationError = hasCompanyFormError(validation);

  const handleSubmit = async () => {
    setHasSubmitted(true);

    if (!company || submitting || hasValidationError) {
      return;
    }

    await onSubmit(toUpdateCompanyInput(company.companyId, form, parsedMonthlyFee, parsedCompanyPointBalance));
  };

  const handleChangePhilosophyItem = (
    itemId: string,
    nextItem: Partial<CompanyFormState["philosophyItems"][number]>,
  ) => {
    setForm((current) => ({
      ...current,
      philosophyItems: current.philosophyItems.map((item) => (item.id === itemId ? { ...item, ...nextItem } : item)),
    }));
  };

  const handleAddPhilosophyItem = () => {
    setForm((current) => ({
      ...current,
      philosophyItems: [...current.philosophyItems, createEmptyCompanyPhilosophyItem()],
    }));
  };

  const handleRemovePhilosophyItem = (itemId: string) => {
    setForm((current) => ({
      ...current,
      philosophyItems: current.philosophyItems.filter((item) => item.id !== itemId),
    }));
  };

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      fullWidth
      maxWidth="md"
      slotProps={{
        paper: {
          sx: {
            borderRadius: "24px",
            p: 1,
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <div className="text-2xl font-bold text-slate-900">企業情報を編集</div>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          契約条件、企業ポイント残高、理念体系を更新します。companyId は変更できません。
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: "8px !important" }}>
        <Stack spacing={3.5}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          {company ? (
            <Alert severity="info" sx={{ "& .MuiAlert-message": { width: "100%" } }}>
              <div className="flex flex-col gap-1">
                <div className="font-semibold text-slate-900">{company.companyName}</div>
                <div className="text-sm text-slate-600">companyId: {company.companyId}</div>
              </div>
            </Alert>
          ) : null}

          <TextField
            label="会社名"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            fullWidth
            required
            error={hasSubmitted && validation.name}
            helperText={hasSubmitted && validation.name ? "会社名を入力してください。" : "正式名称を入力してください。"}
          />

          <div className="grid gap-5 pt-5 md:grid-cols-2">
            <TextField
              select
              label="ステータス"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({ ...current, status: event.target.value as CompanyFormState["status"] }))
              }
              fullWidth
            >
              {statusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="プラン"
              value={form.plan}
              onChange={(event) =>
                setForm((current) => ({ ...current, plan: event.target.value as CompanyFormState["plan"] }))
              }
              fullWidth
            >
              {planOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <TextField
              label="月額単価（円）"
              type="number"
              value={form.perEmployeeMonthlyFee}
              onChange={(event) => setForm((current) => ({ ...current, perEmployeeMonthlyFee: event.target.value }))}
              fullWidth
              required
              error={hasSubmitted && validation.perEmployeeMonthlyFee}
              helperText={
                hasSubmitted && validation.perEmployeeMonthlyFee
                  ? "0 以上の整数で入力してください。"
                  : "従業員 1 人あたりの月額単価です。"
              }
            />

            <TextField
              label="保有ポイント"
              type="number"
              value={form.companyPointBalance}
              onChange={(event) => setForm((current) => ({ ...current, companyPointBalance: event.target.value }))}
              fullWidth
              required
              error={hasSubmitted && validation.companyPointBalance}
              helperText={
                hasSubmitted && validation.companyPointBalance
                  ? "0 以上の整数で入力してください。"
                  : "現在の企業保有ポイント残高です。"
              }
            />
          </div>

          <TextField
            label="ポイント単位"
            value={form.pointUnitLabel}
            onChange={(event) => setForm((current) => ({ ...current, pointUnitLabel: event.target.value }))}
            fullWidth
            required
            error={hasSubmitted && validation.pointUnitLabel}
            helperText={hasSubmitted && validation.pointUnitLabel ? "ポイント単位を入力してください。" : "通常は pt のままで問題ありません。"}
          />

          <div className="pt-1">
            <CompanyPhilosophyFields
              items={form.philosophyItems}
              validation={validation.philosophyItems}
              hasSubmitted={hasSubmitted}
              onAdd={handleAddPhilosophyItem}
              onChangeItem={handleChangePhilosophyItem}
              onRemoveItem={handleRemovePhilosophyItem}
            />
          </div>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ minWidth: 110 }}>
          キャンセル
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
          sx={{ minWidth: 110, borderRadius: "12px", backgroundColor: "#2563EB" }}
        >
          {submitting ? "更新中..." : "更新"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
