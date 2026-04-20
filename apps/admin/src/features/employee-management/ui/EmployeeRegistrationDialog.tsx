"use client";

import { useEffect, useMemo, useState } from "react";
import { JAPAN_PREFECTURES } from "@correcre/lib/user-profile";
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DepartmentAutocompleteField } from "@correcre/ui";

import type {
  CreateEmployeeInput,
  EmployeeAssignableRole,
  EmployeeDepartmentOption,
} from "../model/types";

type EmployeeRegistrationDialogProps = {
  open: boolean;
  submitting: boolean;
  error: string | null;
  departmentOptions: EmployeeDepartmentOption[];
  onClose: () => void;
  onSubmit: (input: CreateEmployeeInput) => Promise<void>;
};

type FormState = CreateEmployeeInput;

type ValidationState = {
  lastName: boolean;
  firstName: boolean;
  lastNameKana: boolean;
  firstNameKana: boolean;
  departmentName: boolean;
  roles: boolean;
  email: boolean;
  phoneNumber: boolean;
  joinedAt: boolean;
  postalCode: boolean;
};

const roleOptions: Array<{ value: EmployeeAssignableRole; label: string }> = [
  { value: "EMPLOYEE", label: "従業員" },
  { value: "ADMIN", label: "管理者" },
  { value: "OPERATOR", label: "運用者" },
];

function getToday() {
  return new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function createInitialFormState(): FormState {
  return {
    lastName: "",
    firstName: "",
    lastNameKana: "",
    firstNameKana: "",
    departmentName: "",
    email: "",
    phoneNumber: "",
    postalCodeFirstHalf: "",
    postalCodeSecondHalf: "",
    prefecture: "",
    city: "",
    building: "",
    roles: ["EMPLOYEE"],
    joinedAt: getToday(),
  };
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidKana(value: string) {
  return /^[ァ-ヶー－\s　]+$/.test(value);
}

function isValidPhoneNumber(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, "");
  return /^[0-9-]+$/.test(phoneNumber) && digits.length >= 10 && digits.length <= 11;
}

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
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

  const validation = useMemo<ValidationState>(() => {
    const email = form.email.trim();
    const phoneNumber = form.phoneNumber?.trim() ?? "";
    const postalCodeFirstHalf = form.postalCodeFirstHalf?.trim() ?? "";
    const postalCodeSecondHalf = form.postalCodeSecondHalf?.trim() ?? "";
    const hasAnyPostalCodeField = Boolean(postalCodeFirstHalf || postalCodeSecondHalf);

    return {
      lastName: !form.lastName.trim(),
      firstName: !form.firstName.trim(),
      lastNameKana: !form.lastNameKana.trim() || !isValidKana(form.lastNameKana.trim()),
      firstNameKana: !form.firstNameKana.trim() || !isValidKana(form.firstNameKana.trim()),
      departmentName: !form.departmentName.trim(),
      roles: form.roles.length === 0,
      email: !email || !isValidEmail(email),
      phoneNumber: Boolean(phoneNumber) && !isValidPhoneNumber(phoneNumber),
      joinedAt: !form.joinedAt.trim(),
      postalCode:
        hasAnyPostalCodeField && (!/^\d{3}$/.test(postalCodeFirstHalf) || !/^\d{4}$/.test(postalCodeSecondHalf)),
    };
  }, [form]);

  const hasError = Object.values(validation).some(Boolean);

  const handleSubmit = async () => {
    setHasSubmitted(true);

    if (hasError || submitting) {
      return;
    }

    await onSubmit({
      lastName: form.lastName.trim(),
      firstName: form.firstName.trim(),
      lastNameKana: form.lastNameKana.trim(),
      firstNameKana: form.firstNameKana.trim(),
      departmentName: form.departmentName.trim(),
      email: form.email.trim(),
      phoneNumber: normalizeOptionalText(form.phoneNumber),
      postalCodeFirstHalf: normalizeOptionalText(form.postalCodeFirstHalf),
      postalCodeSecondHalf: normalizeOptionalText(form.postalCodeSecondHalf),
      prefecture: normalizeOptionalText(form.prefecture),
      city: normalizeOptionalText(form.city),
      building: normalizeOptionalText(form.building),
      roles: form.roles,
      joinedAt: form.joinedAt.trim(),
    });
  };

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      fullWidth
      maxWidth="lg"
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
          氏名、所属部署、連絡先、住所を登録します。ログイン時の認証はメールアドレスで行います。
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: "8px !important" }}>
        <Stack spacing={2.5}>
          {error && <Alert severity="error">{error}</Alert>}
          <Alert severity="info">
            ユーザー登録後も Cognito 連携は未完了です。本人の初回ログイン時に認証情報が紐づきます。
          </Alert>

          <div className="grid gap-4 md:grid-cols-4">
            <TextField
              label="姓"
              value={form.lastName}
              onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
              fullWidth
              required
              error={hasSubmitted && validation.lastName}
              helperText={hasSubmitted && validation.lastName ? "姓を入力してください" : " "}
            />
            <TextField
              label="名"
              value={form.firstName}
              onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
              fullWidth
              required
              error={hasSubmitted && validation.firstName}
              helperText={hasSubmitted && validation.firstName ? "名を入力してください" : " "}
            />
            <TextField
              label="姓フリガナ"
              value={form.lastNameKana}
              onChange={(event) => setForm((current) => ({ ...current, lastNameKana: event.target.value }))}
              fullWidth
              required
              error={hasSubmitted && validation.lastNameKana}
              helperText={
                hasSubmitted && validation.lastNameKana ? "姓フリガナは全角カタカナで入力してください" : " "
              }
            />
            <TextField
              label="名フリガナ"
              value={form.firstNameKana}
              onChange={(event) => setForm((current) => ({ ...current, firstNameKana: event.target.value }))}
              fullWidth
              required
              error={hasSubmitted && validation.firstNameKana}
              helperText={
                hasSubmitted && validation.firstNameKana ? "名フリガナは全角カタカナで入力してください" : " "
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px]">
            <DepartmentAutocompleteField
              departmentOptions={departmentOptions}
              value={form.departmentName}
              error={hasSubmitted && validation.departmentName}
              helperText={
                hasSubmitted && validation.departmentName
                  ? "所属部署を入力してください"
                  : "既存部署を選択、または新しい部署名を入力すると登録時に追加されます"
              }
              label="所属部署"
              onChange={(departmentName) =>
                setForm((current) => ({
                  ...current,
                  departmentName,
                }))
              }
            />

            <FormControl fullWidth error={hasSubmitted && validation.roles}>
              <InputLabel id="admin-employee-registration-roles-label">権限</InputLabel>
              <Select
                labelId="admin-employee-registration-roles-label"
                multiple
                value={form.roles}
                label="権限"
                renderValue={(selected) =>
                  (selected as EmployeeAssignableRole[])
                    .map((role) => roleOptions.find((option) => option.value === role)?.label ?? role)
                    .join(" / ")
                }
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    roles: event.target.value as EmployeeAssignableRole[],
                  }))
                }
              >
                {roleOptions.map((roleOption) => (
                  <MenuItem key={roleOption.value} value={roleOption.value}>
                    <Checkbox checked={form.roles.includes(roleOption.value)} />
                    <ListItemText primary={roleOption.label} />
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {hasSubmitted && validation.roles ? "権限を 1 つ以上選択してください" : " "}
              </FormHelperText>
            </FormControl>

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
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px]">
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
            <TextField
              label="電話番号"
              value={form.phoneNumber}
              onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))}
              fullWidth
              error={hasSubmitted && validation.phoneNumber}
              helperText={
                hasSubmitted && validation.phoneNumber
                  ? "電話番号は 10 桁または 11 桁の数字で入力してください"
                  : "未入力でも登録できます"
              }
            />
            <TextField
              select
              label="都道府県"
              value={form.prefecture}
              onChange={(event) => setForm((current) => ({ ...current, prefecture: event.target.value }))}
              fullWidth
              helperText="未入力でも登録できます"
            >
              <MenuItem value="">未選択</MenuItem>
              {JAPAN_PREFECTURES.map((prefecture) => (
                <MenuItem key={prefecture} value={prefecture}>
                  {prefecture}
                </MenuItem>
              ))}
            </TextField>
          </div>

          <div className="grid gap-4 md:grid-cols-[140px_24px_160px_minmax(0,1.4fr)_minmax(0,1fr)] md:items-start">
            <TextField
              label="郵便番号(前半)"
              value={form.postalCodeFirstHalf}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  postalCodeFirstHalf: event.target.value.replace(/\D/g, "").slice(0, 3),
                }))
              }
              fullWidth
              error={hasSubmitted && validation.postalCode}
              helperText={hasSubmitted && validation.postalCode ? "郵便番号は 3 桁と 4 桁で入力してください" : " "}
            />
            <div className="flex h-full items-center justify-center pt-4 text-lg text-slate-500">-</div>
            <TextField
              label="郵便番号(後半)"
              value={form.postalCodeSecondHalf}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  postalCodeSecondHalf: event.target.value.replace(/\D/g, "").slice(0, 4),
                }))
              }
              fullWidth
              error={hasSubmitted && validation.postalCode}
              helperText={hasSubmitted && validation.postalCode ? "郵便番号は 3 桁と 4 桁で入力してください" : " "}
            />
            <TextField
              label="市区町村・丁目・番地"
              value={form.city}
              onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
              fullWidth
              helperText="未入力でも登録できます"
            />
            <TextField
              label="建物名・部屋番号"
              value={form.building}
              onChange={(event) => setForm((current) => ({ ...current, building: event.target.value }))}
              fullWidth
              helperText="未入力でも登録できます"
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
          {submitting ? "登録中..." : "登録"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
