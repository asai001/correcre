"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from "@mui/material";

import type { MerchantStatus } from "@correcre/types";
import type { CreateMerchantInput, MerchantSummary, UpdateMerchantInput } from "../model/types";

const storeAddressModeOptions = [
  { value: "same_company", label: "会社と同じ" },
  { value: "no_store", label: "店舗無し" },
  { value: "other", label: "その他" },
] as const;

const statusOptions: Array<{ value: MerchantStatus; label: string }> = [
  { value: "ACTIVE", label: "登録済" },
  { value: "INACTIVE", label: "停止中" },
];

type FormState = {
  name: string;
  kanaName: string;
  status: MerchantStatus;
  companyLocation: string;
  storeAddressMode: CreateMerchantInput["storeAddressMode"];
  storeAddressOther: string;
  customerInquiryContact: string;
  contactPersonName: string;
  contactPersonPhone: string;
  contactEmail: string;
  bankTransferAccount: string;
  paymentCycle: string;
};

function toFormState(merchant: MerchantSummary): FormState {
  return {
    name: merchant.name,
    kanaName: merchant.kanaName ?? "",
    status: merchant.status,
    companyLocation: merchant.companyLocation,
    storeAddressMode: merchant.storeAddressMode,
    storeAddressOther: merchant.storeAddressOther ?? "",
    customerInquiryContact: merchant.customerInquiryContact,
    contactPersonName: merchant.contactPersonName,
    contactPersonPhone: merchant.contactPersonPhone,
    contactEmail: merchant.contactEmail ?? "",
    bankTransferAccount: merchant.bankTransferAccount ?? "",
    paymentCycle: merchant.paymentCycle ?? "",
  };
}

type MerchantEditDialogProps = {
  open: boolean;
  merchant: MerchantSummary | null;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: UpdateMerchantInput) => void;
};

export default function MerchantEditDialog({
  open,
  merchant,
  submitting,
  error,
  onClose,
  onSubmit,
}: MerchantEditDialogProps) {
  const [form, setForm] = useState<FormState | null>(merchant ? toFormState(merchant) : null);

  useEffect(() => {
    setForm(merchant ? toFormState(merchant) : null);
  }, [merchant]);

  const handleChange =
    (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    };

  const handleSubmit = () => {
    if (!merchant || !form || submitting) return;

    onSubmit({
      merchantId: merchant.merchantId,
      name: form.name,
      kanaName: form.kanaName || undefined,
      status: form.status,
      companyLocation: form.companyLocation,
      storeAddressMode: form.storeAddressMode,
      storeAddressOther: form.storeAddressMode === "other" ? form.storeAddressOther : undefined,
      customerInquiryContact: form.customerInquiryContact,
      contactPersonName: form.contactPersonName,
      contactPersonPhone: form.contactPersonPhone,
      contactEmail: form.contactEmail || undefined,
      bankTransferAccount: form.bankTransferAccount || undefined,
      paymentCycle: form.paymentCycle || undefined,
    });
  };

  const statusMenuOptions =
    form && !statusOptions.some((option) => option.value === form.status)
      ? [...statusOptions, { value: form.status, label: form.status }]
      : statusOptions;

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: "24px" } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>提携企業情報を編集</DialogTitle>
      <DialogContent dividers>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        {form ? (
          <div className="mt-1 grid gap-4 md:grid-cols-2">
            <TextField label="提携企業名" required fullWidth value={form.name} onChange={handleChange("name")} />
            <TextField label="フリガナ" fullWidth value={form.kanaName} onChange={handleChange("kanaName")} />
            <TextField select label="ステータス" value={form.status} onChange={handleChange("status")}>
              {statusMenuOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <div />
            <TextField
              className="md:col-span-2"
              label="会社所在地"
              required
              fullWidth
              multiline
              minRows={2}
              value={form.companyLocation}
              onChange={handleChange("companyLocation")}
            />
            <TextField select label="店舗住所" value={form.storeAddressMode} onChange={handleChange("storeAddressMode")}>
              {storeAddressModeOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            {form.storeAddressMode === "other" ? (
              <TextField
                label="店舗住所（表示用）"
                required
                fullWidth
                multiline
                minRows={2}
                value={form.storeAddressOther}
                onChange={handleChange("storeAddressOther")}
              />
            ) : (
              <div />
            )}
            <TextField
              className="md:col-span-2"
              label="お客様からの問い合わせ先"
              required
              fullWidth
              multiline
              minRows={2}
              value={form.customerInquiryContact}
              onChange={handleChange("customerInquiryContact")}
            />
            <TextField label="担当者名" required fullWidth value={form.contactPersonName} onChange={handleChange("contactPersonName")} />
            <TextField
              label="担当者電話番号"
              required
              fullWidth
              value={form.contactPersonPhone}
              onChange={handleChange("contactPersonPhone")}
            />
            <TextField label="代表メールアドレス" type="email" fullWidth value={form.contactEmail} onChange={handleChange("contactEmail")} />
            <TextField label="入金サイクル" fullWidth value={form.paymentCycle} onChange={handleChange("paymentCycle")} />
            <TextField
              className="md:col-span-2"
              label="お振込先"
              fullWidth
              multiline
              minRows={2}
              value={form.bankTransferAccount}
              onChange={handleChange("bankTransferAccount")}
            />
          </div>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          キャンセル
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
          sx={{ borderRadius: "12px", backgroundColor: "#0f766e", "&:hover": { backgroundColor: "#115e59" } }}
        >
          {submitting ? "保存中..." : "保存"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
