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
    departments: [],
    email: "",
    phone: "",
    address: "",
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
    const email = form.email.trim();
    const phone = form.phone.trim();
    const address = form.address.trim();
    const joinedAt = form.joinedAt.trim();

    return {
      name: !name,
      loginId: !loginId,
      departments: form.departments.length === 0,
      email: !email || !isValidEmail(email),
      phone: !phone,
      address: !address,
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
      departments: form.departments,
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
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
        <div className="text-2xl font-bold text-slate-900">運営用ユーザー登録</div>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          事前招待型のユーザー登録です。ここでは認証連携IDを手入力せず、初回ログイン後に連携する前提でユーザーを作成します。
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: "8px !important" }}>
        <Stack spacing={2.5}>
          {error && <Alert severity="error">{error}</Alert>}
          <Alert severity="info">
            認証連携IDはこの画面では登録しません。運営は `loginId` / `email` / 権限 / 部署を事前登録し、
            認証連携は初回ログイン後に行う想定です。
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
            <FormControl fullWidth error={hasSubmitted && validation.departments}>
              <InputLabel id="department-select-label">所属部署</InputLabel>
              <Select
                labelId="department-select-label"
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
                    <ListItemText primary={departmentOption.name} secondary={`${departmentOption.employeeCount}名`} />
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
              label="ログインID"
              value={form.loginId}
              onChange={(event) => setForm((current) => ({ ...current, loginId: event.target.value }))}
              fullWidth
              required
              placeholder="taro.yamada"
              error={hasSubmitted && validation.loginId}
              helperText={hasSubmitted && validation.loginId ? "ログインIDを入力してください" : "英小文字・数字・._- を推奨"}
            />
            <TextField
              label="メールアドレス"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              fullWidth
              required
              error={hasSubmitted && validation.email}
              helperText={
                hasSubmitted && validation.email
                  ? "メールアドレスを正しく入力してください"
                  : "初回ログイン時の本人確認に使います"
              }
            />
          </div>

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
