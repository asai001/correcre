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

import type { CreateEmployeeInput, EmployeeDepartmentOption, EmployeeManagementRole } from "../model/types";

type EmployeeRegistrationDialogProps = {
  open: boolean;
  submitting: boolean;
  error: string | null;
  departmentOptions: EmployeeDepartmentOption[];
  onClose: () => void;
  onSubmit: (input: CreateEmployeeInput) => Promise<void>;
};

type FormState = CreateEmployeeInput;

const roleOptions: Array<{ value: EmployeeManagementRole; label: string }> = [
  { value: "EMPLOYEE", label: "一般" },
  { value: "MANAGER", label: "マネージャー" },
  { value: "ADMIN", label: "管理者" },
];

function getToday() {
  return new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function createInitialFormState(): FormState {
  return {
    name: "",
    loginId: "",
    departmentName: "",
    email: "",
    role: "EMPLOYEE",
    joinedAt: getToday(),
  };
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function EmployeeRegistrationDialog({
  open,
  submitting,
  error,
  departmentOptions,
  onClose,
  onSubmit,
}: EmployeeRegistrationDialogProps) {
  const [form, setForm] = useState<FormState>(() => createInitialFormState());
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(createInitialFormState());
    setHasSubmitted(false);
  }, [open]);

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
    };
  }, [form]);

  const hasError = Object.values(validation).some(Boolean);

  const handleSubmit = async () => {
    setHasSubmitted(true);

    if (hasError || submitting) {
      return;
    }

    await onSubmit({
      name: form.name.trim(),
      loginId: form.loginId.trim(),
      departmentName: form.departmentName.trim(),
      email: form.email.trim(),
      role: form.role,
      joinedAt: form.joinedAt.trim(),
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
        <div className="text-2xl font-bold text-slate-900">ユーザー登録</div>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          `infra/README.md` の User テーブル構成に合わせて、ログイン ID・メールアドレス・所属部署・権限を登録します。
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: "8px !important" }}>
        <Stack spacing={2.5}>
          {error && <Alert severity="error">{error}</Alert>}
          <Alert severity="info">
            電話番号や住所は User テーブルには含まれないため、この画面では登録しません。Cognito 連携は初回ログイン後に紐付きます。
          </Alert>

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
              <InputLabel id="operator-employee-registration-department-label">所属部署</InputLabel>
              <Select
                labelId="operator-employee-registration-department-label"
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
              placeholder="taro.yamada"
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
          {submitting ? "登録中..." : "登録"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
