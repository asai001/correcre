"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, MenuItem, TextField } from "@mui/material";

import AdminPageHeader from "@merchant/components/AdminPageHeader";

import { updateCompanyInfo } from "../api/client";
import type { MerchantCompanyInfo } from "../model/types";

type Props = {
  initialData: MerchantCompanyInfo;
  merchantUserName: string;
  merchantDisplayName?: string;
};

const storeAddressModeOptions = [
  { value: "same_company", label: "会社と同じ" },
  { value: "no_store", label: "店舗無し" },
  { value: "other", label: "その他" },
] as const;

type FormState = {
  name: string;
  displayName: string;
  kanaName: string;
  companyLocation: string;
  storeAddressMode: MerchantCompanyInfo["storeAddressMode"];
  storeAddressOther: string;
  customerInquiryContact: string;
  contactPersonName: string;
  contactPersonPhone: string;
  contactEmail: string;
  paymentCycle: string;
  bankTransferAccount: string;
};

function createFormState(data: MerchantCompanyInfo): FormState {
  return {
    name: data.name ?? "",
    displayName: data.displayName ?? "",
    kanaName: data.kanaName ?? "",
    companyLocation: data.companyLocation ?? "",
    storeAddressMode: data.storeAddressMode ?? "same_company",
    storeAddressOther: data.storeAddressOther ?? "",
    customerInquiryContact: data.customerInquiryContact ?? "",
    contactPersonName: data.contactPersonName ?? "",
    contactPersonPhone: data.contactPersonPhone ?? "",
    contactEmail: data.contactEmail ?? "",
    paymentCycle: data.paymentCycle ?? "",
    bankTransferAccount: data.bankTransferAccount ?? "",
  };
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export default function CompanyInfoForm({ initialData, merchantUserName, merchantDisplayName }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => createFormState(initialData));
  const [headerUserName, setHeaderUserName] = useState(merchantUserName);
  const [headerDisplayName, setHeaderDisplayName] = useState(merchantDisplayName ?? initialData.displayName ?? initialData.name);
  const [updatedAt, setUpdatedAt] = useState(initialData.updatedAt);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange =
    (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleSubmit = async () => {
    if (submitting) return;

    setSubmitting(true);
    setNotice(null);
    setError(null);

    try {
      const updated = await updateCompanyInfo({
        name: form.name,
        displayName: form.displayName || undefined,
        kanaName: form.kanaName || undefined,
        companyLocation: form.companyLocation,
        storeAddressMode: form.storeAddressMode,
        storeAddressOther: form.storeAddressMode === "other" ? form.storeAddressOther : undefined,
        customerInquiryContact: form.customerInquiryContact,
        contactPersonName: form.contactPersonName,
        contactPersonPhone: form.contactPersonPhone,
        contactEmail: form.contactEmail || undefined,
        paymentCycle: form.paymentCycle || undefined,
        bankTransferAccount: form.bankTransferAccount || undefined,
      });

      setForm(createFormState(updated));
      setHeaderUserName(updated.contactPersonName);
      setHeaderDisplayName(updated.displayName ?? updated.name);
      setUpdatedAt(updated.updatedAt);
      setNotice("会社情報を更新しました");
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "会社情報の更新に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        title="会社情報"
        adminName={headerUserName}
        merchantDisplayName={headerDisplayName}
        subtitle="提携企業の会社情報を確認・編集します。"
        backHref="/dashboard"
      />

      {notice ? <Alert severity="success">{notice}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
        <div className="mb-5 border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold text-slate-900">会社情報</h2>
          <p className="mt-1 text-sm text-slate-500">
            登録内容を編集できます。表示名は商品・サービス一覧に表示される名称です。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="会社ID"
            value={initialData.merchantId}
            fullWidth
            slotProps={{ input: { readOnly: true } }}
          />
          <TextField
            label="最終更新日時"
            value={formatDateTime(updatedAt)}
            fullWidth
            slotProps={{ input: { readOnly: true } }}
          />

          <TextField label="提携企業名" required fullWidth value={form.name} onChange={handleChange("name")} />
          <TextField label="フリガナ" fullWidth value={form.kanaName} onChange={handleChange("kanaName")} />

          <TextField
            className="md:col-span-2"
            label="表示名"
            fullWidth
            value={form.displayName}
            onChange={handleChange("displayName")}
            helperText="一覧に表示される名称です。店舗名などがあればご入力ください。未入力の場合は会社名が表示されます"
          />

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

          <TextField
            select
            label="店舗住所"
            value={form.storeAddressMode}
            onChange={handleChange("storeAddressMode")}
          >
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

          <TextField
            label="担当者名"
            required
            fullWidth
            value={form.contactPersonName}
            onChange={handleChange("contactPersonName")}
          />
          <TextField
            label="担当者電話番号"
            required
            fullWidth
            value={form.contactPersonPhone}
            onChange={handleChange("contactPersonPhone")}
          />

          <TextField
            label="代表メールアドレス"
            type="email"
            fullWidth
            value={form.contactEmail}
            onChange={handleChange("contactEmail")}
          />
          <TextField
            label="入金サイクル"
            fullWidth
            value={form.paymentCycle}
            onChange={handleChange("paymentCycle")}
          />

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

        <div className="mt-6 flex justify-end">
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
            className="!rounded-full !px-7 !py-2.5"
          >
            {submitting ? "保存中..." : "会社情報を保存"}
          </Button>
        </div>
      </section>
    </div>
  );
}
