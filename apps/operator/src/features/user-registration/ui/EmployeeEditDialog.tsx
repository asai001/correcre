"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import type {
  EmployeeDepartmentOption,
  EmployeeManagementEmployee,
  EmployeeManagementRole,
  UpdateEmployeeInput,
} from "../model/types";

type EmployeeEditDialogProps = {
  open: boolean;
  employee: EmployeeManagementEmployee | null;
  submitting: boolean;
  error: string | null;
  pointUnitLabel: string;
  departmentOptions: EmployeeDepartmentOption[];
  onClose: () => void;
  onSubmit: (input: UpdateEmployeeInput) => Promise<void>;
};

type FormState = Omit<UpdateEmployeeInput, "pointAdjustment"> & {
  pointAdjustment: string;
};

const roleOptions: Array<{ value: EmployeeManagementRole; label: string }> = [
  { value: "EMPLOYEE", label: "一般" },
  { value: "MANAGER", label: "マネージャー" },
  { value: "ADMIN", label: "管理者" },
];

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatNumber(value: number) {
  return value.toLocaleString("ja-JP");
}

function getPrimaryRole(roles: EmployeeManagementRole[]): EmployeeManagementRole {
  if (roles.includes("ADMIN")) {
    return "ADMIN";
  }

  if (roles.includes("MANAGER")) {
    return "MANAGER";
  }

  return "EMPLOYEE";
}

function createInitialFormState(employee: EmployeeManagementEmployee | null): FormState {
  return {
    userId: employee?.userId ?? "",
    name: employee?.name ?? "",
    loginId: employee?.loginId ?? "",
    departmentName: employee?.departmentName ?? "",
    email: employee?.email ?? "",
    role: employee ? getPrimaryRole(employee.roles) : "EMPLOYEE",
    joinedAt: employee?.joinedAt ?? "",
    pointAdjustment: "0",
  };
}

export default function EmployeeEditDialog({
  open,
  employee,
  submitting,
  error,
  pointUnitLabel,
  departmentOptions,
  onClose,
  onSubmit,
}: EmployeeEditDialogProps) {
  const [form, setForm] = useState<FormState>(() => createInitialFormState(employee));
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(createInitialFormState(employee));
    setHasSubmitted(false);
  }, [employee, open]);

  const pointAdjustmentValue = form.pointAdjustment.trim();
  const parsedPointAdjustment =
    /^-?\d+$/.test(pointAdjustmentValue) ? Number.parseInt(pointAdjustmentValue, 10) : null;
  const currentPointBalance = employee?.pointBalance ?? 0;
  const nextPointBalance =
    parsedPointAdjustment === null ? currentPointBalance : currentPointBalance + parsedPointAdjustment;

  const validation = useMemo(() => {
    const name = form.name.trim();
    const loginId = form.loginId.trim();
    const departmentName = form.departmentName.trim();
    const email = form.email.trim();
    const joinedAt = form.joinedAt.trim();

    return {
      name: !name,
      loginId: !loginId,
      departmentName: !departmentName,
      email: !email || !isValidEmail(email),
      joinedAt: !joinedAt,
      pointAdjustment: parsedPointAdjustment === null,
      pointBalance: parsedPointAdjustment !== null && nextPointBalance < 0,
    };
  }, [form, nextPointBalance, parsedPointAdjustment]);

  const hasError = Object.values(validation).some(Boolean);

  const handleSubmit = async () => {
    setHasSubmitted(true);

    if (hasError || submitting || !employee || parsedPointAdjustment === null) {
      return;
    }

    await onSubmit({
      userId: employee.userId,
      name: form.name.trim(),
      loginId: form.loginId.trim(),
      departmentName: form.departmentName.trim(),
      email: form.email.trim(),
      role: form.role,
      joinedAt: form.joinedAt.trim(),
      pointAdjustment: parsedPointAdjustment,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: "24px",
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <div className="text-2xl font-bold text-slate-900">ユーザー編集</div>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          User テーブルに保存される項目のみを更新します。ポイント調整は会社ポイントとの整合性を確認して反映します。
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: "8px !important" }}>
        <Stack spacing={2.5}>
          {error && <Alert severity="error">{error}</Alert>}
          {employee && (
            <Alert severity={employee.authLinkStatus === "LINKED" ? "success" : "info"}>
              Cognito 連携状態: {employee.authLinkStatus === "LINKED" ? "連携済み" : "未連携"}
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="氏名"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              fullWidth
              required
              error={hasSubmitted && validation.name}
              helperText={hasSubmitted && validation.name ? "氏名を入力してください" : " "}
            />
            <FormControl fullWidth error={hasSubmitted && validation.departmentName}>
              <InputLabel id="operator-employee-edit-department-label">所属部署</InputLabel>
              <Select
                labelId="operator-employee-edit-department-label"
                value={form.departmentName}
                label="所属部署"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    departmentName: event.target.value,
                  }))
                }
              >
                {departmentOptions.map((departmentOption) => (
                  <MenuItem key={departmentOption.name} value={departmentOption.name}>
                    {departmentOption.name} ({departmentOption.employeeCount}人)
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {hasSubmitted && validation.departmentName ? "所属部署を選択してください" : " "}
              </FormHelperText>
            </FormControl>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="ログイン ID"
              value={form.loginId}
              onChange={(event) => setForm((current) => ({ ...current, loginId: event.target.value }))}
              fullWidth
              required
              error={hasSubmitted && validation.loginId}
              helperText={hasSubmitted && validation.loginId ? "ログイン ID を入力してください" : "英小文字・数字・._- を使用"}
            />
            <TextField
              label="メールアドレス"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              fullWidth
              required
              error={hasSubmitted && validation.email}
              helperText={hasSubmitted && validation.email ? "有効なメールアドレスを入力してください" : " "}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <TextField
              label="入社日"
              type="date"
              value={form.joinedAt}
              onChange={(event) => setForm((current) => ({ ...current, joinedAt: event.target.value }))}
              fullWidth
              required
              slotProps={{ inputLabel: { shrink: true } }}
              error={hasSubmitted && validation.joinedAt}
              helperText={hasSubmitted && validation.joinedAt ? "入社日を入力してください" : " "}
            />
            <TextField
              select
              label="権限"
              value={form.role}
              onChange={(event) =>
                setForm((current) => ({ ...current, role: event.target.value as EmployeeManagementRole }))
              }
              fullWidth
            >
              {roleOptions.map((roleOption) => (
                <MenuItem key={roleOption.value} value={roleOption.value}>
                  {roleOption.label}
                </MenuItem>
              ))}
            </TextField>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 text-sm font-semibold text-slate-700">ポイント調整</div>
            <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)_180px]">
              <TextField
                label="現在ポイント"
                value={`${formatNumber(currentPointBalance)}${pointUnitLabel}`}
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />
              <TextField
                label="調整値"
                type="number"
                value={form.pointAdjustment}
                onChange={(event) => setForm((current) => ({ ...current, pointAdjustment: event.target.value }))}
                fullWidth
                slotProps={{ htmlInput: { step: 1 } }}
                error={hasSubmitted && (validation.pointAdjustment || validation.pointBalance)}
                helperText={
                  hasSubmitted && validation.pointAdjustment
                    ? "整数で入力してください"
                    : hasSubmitted && validation.pointBalance
                      ? "調整後のポイントが 0 未満になります"
                      : "加算は正の数、減算は負の数で入力してください"
                }
              />
              <TextField
                label="調整後ポイント"
                value={`${formatNumber(Math.max(nextPointBalance, 0))}${pointUnitLabel}`}
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />
            </div>
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
