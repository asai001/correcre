"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { JAPAN_PREFECTURES, splitPostalCode } from "@correcre/lib/user-profile";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import type { EditableEmployeeProfile, UpdateOwnProfileInput } from "../model/types";

type ProfileEditDialogProps = {
  open: boolean;
  profile: EditableEmployeeProfile | null;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: UpdateOwnProfileInput) => Promise<void>;
};

type FormState = UpdateOwnProfileInput;

type ValidationState = {
  lastName: boolean;
  firstName: boolean;
  lastNameKana: boolean;
  firstNameKana: boolean;
  email: boolean;
  phoneNumber: boolean;
  postalCode: boolean;
};

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

function createInitialFormState(profile: EditableEmployeeProfile | null): FormState {
  const postalCode = splitPostalCode(profile?.address?.postalCode);

  return {
    lastName: profile?.lastName ?? "",
    firstName: profile?.firstName ?? "",
    lastNameKana: profile?.lastNameKana ?? "",
    firstNameKana: profile?.firstNameKana ?? "",
    email: profile?.email ?? "",
    phoneNumber: profile?.phoneNumber ?? "",
    postalCodeFirstHalf: postalCode.postalCodeFirstHalf,
    postalCodeSecondHalf: postalCode.postalCodeSecondHalf,
    prefecture: profile?.address?.prefecture ?? "",
    city: profile?.address?.city ?? "",
    building: profile?.address?.building ?? "",
  };
}

export default function ProfileEditDialog({ open, profile, submitting, error, onClose, onSubmit }: ProfileEditDialogProps) {
  const [form, setForm] = useState<FormState>(() => createInitialFormState(profile));
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [addressAutoFilling, setAddressAutoFilling] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(createInitialFormState(profile));
    setHasSubmitted(false);
  }, [open, profile]);

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
      email: !email || !isValidEmail(email),
      phoneNumber: Boolean(phoneNumber) && !isValidPhoneNumber(phoneNumber),
      postalCode: hasAnyPostalCodeField && (!/^\d{3}$/.test(postalCodeFirstHalf) || !/^\d{4}$/.test(postalCodeSecondHalf)),
    };
  }, [form]);

  const hasError = Object.values(validation).some(Boolean);

  const handleAutoFillAddress = async () => {
    const firstHalf = form.postalCodeFirstHalf?.trim() ?? "";
    const secondHalf = form.postalCodeSecondHalf?.trim() ?? "";

    if (!/^\d{3}$/.test(firstHalf) || !/^\d{4}$/.test(secondHalf)) {
      return;
    }

    setAddressAutoFilling(true);
    try {
      const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${firstHalf}${secondHalf}`);
      const data = await response.json();
      const result = data.results?.[0];

      if (result) {
        setForm((current) => ({
          ...current,
          prefecture: result.address1 ?? "",
          city: `${result.address2 ?? ""}${result.address3 ?? ""}`,
        }));
      }
    } finally {
      setAddressAutoFilling(false);
    }
  };

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
      email: form.email.trim(),
      phoneNumber: normalizeOptionalText(form.phoneNumber),
      postalCodeFirstHalf: normalizeOptionalText(form.postalCodeFirstHalf),
      postalCodeSecondHalf: normalizeOptionalText(form.postalCodeSecondHalf),
      prefecture: normalizeOptionalText(form.prefecture),
      city: normalizeOptionalText(form.city),
      building: normalizeOptionalText(form.building),
    });
  };

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await handleSubmit();
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
      <Box component="form" onSubmit={handleFormSubmit}>
        <DialogTitle sx={{ pb: 1 }}>
          <div className="text-2xl font-bold text-slate-900">登録情報変更</div>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            氏名、住所、連絡先を更新します。
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: "8px !important" }}>
          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}

            <div className="grid gap-4 md:grid-cols-4" style={{ marginTop: "3rem" }}>
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
                helperText={hasSubmitted && validation.lastNameKana ? "姓フリガナは全角カタカナで入力してください" : " "}
              />
              <TextField
                label="名フリガナ"
                value={form.firstNameKana}
                onChange={(event) => setForm((current) => ({ ...current, firstNameKana: event.target.value }))}
                fullWidth
                required
                error={hasSubmitted && validation.firstNameKana}
                helperText={hasSubmitted && validation.firstNameKana ? "名フリガナは全角カタカナで入力してください" : " "}
              />
            </div>

            <div>
              <Typography variant="body2" fontWeight="bold" color="text.secondary" sx={{ mb: 1 }}>
                郵便番号
              </Typography>
              <div className="flex items-start gap-4">
                <TextField
                  label="前半3桁"
                  value={form.postalCodeFirstHalf}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      postalCodeFirstHalf: event.target.value.replace(/\D/g, "").slice(0, 3),
                    }))
                  }
                  sx={{ width: 130 }}
                  error={hasSubmitted && validation.postalCode}
                  helperText={hasSubmitted && validation.postalCode ? "3桁で入力" : " "}
                />
                <div className="flex items-center pt-4 text-lg text-slate-500">-</div>
                <TextField
                  label="後半4桁"
                  value={form.postalCodeSecondHalf}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      postalCodeSecondHalf: event.target.value.replace(/\D/g, "").slice(0, 4),
                    }))
                  }
                  sx={{ width: 130 }}
                  error={hasSubmitted && validation.postalCode}
                  helperText={hasSubmitted && validation.postalCode ? "4桁で入力" : " "}
                />
                <Button
                  type="button"
                  variant="outlined"
                  onClick={handleAutoFillAddress}
                  disabled={addressAutoFilling}
                  sx={{ mt: "8px", whiteSpace: "nowrap" }}
                >
                  自動入力
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[130px_minmax(0,2fr)_minmax(0,1fr)]">
              <TextField
                select
                label="都道府県"
                value={form.prefecture}
                onChange={(event) => setForm((current) => ({ ...current, prefecture: event.target.value }))}
                fullWidth
                helperText=" "
              >
                <MenuItem value="">未選択</MenuItem>
                {JAPAN_PREFECTURES.map((prefecture) => (
                  <MenuItem key={prefecture} value={prefecture}>
                    {prefecture}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="市区町村・丁目・番地"
                value={form.city}
                onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                fullWidth
                helperText=" "
              />
              <TextField
                label="建物名・部屋番号"
                value={form.building}
                onChange={(event) => setForm((current) => ({ ...current, building: event.target.value }))}
                fullWidth
                helperText=" "
              />
            </div>

            <div className="grid gap-4 md:grid-cols-[130px_minmax(0,2fr)_minmax(0,1fr)]">
              <TextField
                className="md:col-span-2"
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
              helperText={hasSubmitted && validation.phoneNumber ? "電話番号は 10 桁または 11 桁の数字で入力してください" : " "}
            />
            </div>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
          <Button type="button" onClick={onClose} disabled={submitting} sx={{ minWidth: 110 }}>
            キャンセル
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            sx={{ minWidth: 110, borderRadius: "12px", backgroundColor: "#2563EB" }}
          >
            {submitting ? "更新中..." : "更新"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
