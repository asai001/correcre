"use client";

import { useEffect, useMemo, useState } from "react";
import { JAPAN_PREFECTURES, splitPostalCode } from "@correcre/lib/user-profile";
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

import type {
  EmployeeAssignableRole,
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
  pointAdjustment: boolean;
  pointBalance: boolean;
  postalCode: boolean;
};

const roleOptions: Array<{ value: EmployeeAssignableRole; label: string }> = [
  { value: "EMPLOYEE", label: "従業員" },
  { value: "ADMIN", label: "管理者" },
  { value: "OPERATOR", label: "運用者" },
];

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

function formatNumber(value: number) {
  return value.toLocaleString("ja-JP");
}

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function getInitialRoles(roles: EmployeeManagementRole[]): EmployeeAssignableRole[] {
  const filtered = roles.filter(
    (role): role is EmployeeAssignableRole =>
      role === "EMPLOYEE" || role === "ADMIN" || role === "OPERATOR",
  );

  return filtered.length ? filtered : ["EMPLOYEE"];
}

function createInitialFormState(employee: EmployeeManagementEmployee | null): FormState {
  const postalCode = splitPostalCode(employee?.address?.postalCode);

  return {
    userId: employee?.userId ?? "",
    lastName: employee?.lastName ?? "",
    firstName: employee?.firstName ?? "",
    lastNameKana: employee?.lastNameKana ?? "",
    firstNameKana: employee?.firstNameKana ?? "",
    departmentName: employee?.departmentName ?? "",
    email: employee?.email ?? "",
    phoneNumber: employee?.phoneNumber ?? "",
    postalCodeFirstHalf: postalCode.postalCodeFirstHalf,
    postalCodeSecondHalf: postalCode.postalCodeSecondHalf,
    prefecture: employee?.address?.prefecture ?? "",
    city: employee?.address?.city ?? "",
    building: employee?.address?.building ?? "",
    roles: employee ? getInitialRoles(employee.roles) : ["EMPLOYEE"],
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
      pointAdjustment: parsedPointAdjustment === null,
      pointBalance: parsedPointAdjustment !== null && nextPointBalance < 0,
      postalCode:
        hasAnyPostalCodeField && (!/^\d{3}$/.test(postalCodeFirstHalf) || !/^\d{4}$/.test(postalCodeSecondHalf)),
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
      pointAdjustment: parsedPointAdjustment,
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
        <div className="text-2xl font-bold text-slate-900">ユーザー編集</div>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          基本情報と連絡先を更新します。ポイント調整は会社ポイントとの整合性を保ったまま反映されます。
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: "8px !important" }}>
        <Stack spacing={2.5}>
          {error && <Alert severity="error">{error}</Alert>}
          {employee && (
            employee.authLinkStatus === "LINKED" ? (
              <Alert severity="success">Cognito 連携状況: 連携済み</Alert>
            ) : (
              <Alert severity="error">
                Cognito 連携状況: 未連携です。User.cognitoSub が欠落している異常状態のため、このユーザーは正常にログインできません。早急に確認してください。
              </Alert>
            )
          )}

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
            <FormControl fullWidth error={hasSubmitted && validation.departmentName}>
              <InputLabel id="admin-employee-edit-department-label">所属部署</InputLabel>
              <Select
                labelId="admin-employee-edit-department-label"
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

            <FormControl fullWidth error={hasSubmitted && validation.roles}>
              <InputLabel id="admin-employee-edit-roles-label">権限</InputLabel>
              <Select
                labelId="admin-employee-edit-roles-label"
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
