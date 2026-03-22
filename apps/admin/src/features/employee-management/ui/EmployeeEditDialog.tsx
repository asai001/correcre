"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
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
    departments: employee?.departments ?? [],
    email: employee?.email ?? "",
    phone: employee?.phone ?? "",
    address: employee?.address ?? "",
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
    const email = form.email.trim();
    const phone = form.phone.trim();
    const address = form.address.trim();
    const joinedAt = form.joinedAt.trim();

    return {
      name: !name,
      departments: form.departments.length === 0,
      email: !email || !isValidEmail(email),
      phone: !phone,
      address: !address,
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
      departments: form.departments,
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
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
        <div className="text-2xl font-bold text-slate-900">従業員情報を編集</div>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          基本情報の更新と保有ポイントの増減を行います。ポイント増減は 1 回の調整量を入力してください。
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: "8px !important" }}>
        <Stack spacing={2.5}>
          {error && <Alert severity="error">{error}</Alert>}

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
            <FormControl fullWidth error={hasSubmitted && validation.departments}>
              <InputLabel id="employee-edit-department-select-label">所属部署</InputLabel>
              <Select
                labelId="employee-edit-department-select-label"
                multiple
                value={form.departments}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    departments: typeof event.target.value === "string" ? event.target.value.split(",") : event.target.value,
                  }))
                }
                input={<OutlinedInput label="所属部署" />}
                renderValue={(selected) => (
                  <div className="flex flex-wrap gap-1">
                    {(selected as string[]).map((department) => (
                      <Chip key={department} label={department} size="small" />
                    ))}
                  </div>
                )}
              >
                {departmentOptions.map((departmentOption) => (
                  <MenuItem key={departmentOption.name} value={departmentOption.name}>
                    <Checkbox checked={form.departments.includes(departmentOption.name)} />
                    <ListItemText primary={departmentOption.name} secondary={`${departmentOption.employeeCount}名所属`} />
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {hasSubmitted && validation.departments ? "所属部署を1つ以上選択してください" : " "}
              </FormHelperText>
            </FormControl>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="メールアドレス"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              fullWidth
              required
              error={hasSubmitted && validation.email}
              helperText={hasSubmitted && validation.email ? "メールアドレスを正しく入力してください" : " "}
            />
            <TextField
              label="連絡先"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              fullWidth
              required
              placeholder="090-1234-5678"
              error={hasSubmitted && validation.phone}
              helperText={hasSubmitted && validation.phone ? "連絡先を入力してください" : " "}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <TextField
              label="住所"
              value={form.address}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              fullWidth
              required
              error={hasSubmitted && validation.address}
              helperText={hasSubmitted && validation.address ? "住所を入力してください" : " "}
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

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 text-sm font-semibold text-slate-700">保有ポイントを調整</div>
            <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)_180px]">
              <TextField
                label="現在の保有ポイント"
                value={`${formatNumber(currentPointBalance)}${pointUnitLabel}`}
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />
              <TextField
                label="ポイント増減"
                type="number"
                value={form.pointAdjustment}
                onChange={(event) => setForm((current) => ({ ...current, pointAdjustment: event.target.value }))}
                fullWidth
                slotProps={{ htmlInput: { step: 1 } }}
                error={hasSubmitted && (validation.pointAdjustment || validation.pointBalance)}
                helperText={
                  hasSubmitted && validation.pointAdjustment
                    ? "増減ポイントは整数で入力してください"
                    : hasSubmitted && validation.pointBalance
                      ? "調整後の保有ポイントが 0 未満になります"
                      : "増やす場合は正の数、減らす場合は負の数を入力"
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
