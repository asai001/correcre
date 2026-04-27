"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert, Button, MenuItem, TextField } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUpRightFromSquare, faCirclePlus, faStore } from "@fortawesome/free-solid-svg-icons";

import AdminPageHeader from "@operator/components/AdminPageHeader";
import { createMerchant } from "../api/client";
import type { CreateMerchantInput, MerchantSummary } from "../model/types";

const storeAddressModeOptions = [
  { value: "same_company", label: "会社と同じ" },
  { value: "no_store", label: "店舗無し" },
  { value: "other", label: "その他" },
] as const;

type FormState = {
  name: string;
  kanaName: string;
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

function createInitialFormState(): FormState {
  return {
    name: "",
    kanaName: "",
    companyLocation: "",
    storeAddressMode: "same_company",
    storeAddressOther: "",
    customerInquiryContact: "",
    contactPersonName: "",
    contactPersonPhone: "",
    contactEmail: "",
    bankTransferAccount: "",
    paymentCycle: "",
  };
}

type MerchantManagementProps = {
  initialMerchants: MerchantSummary[];
  operatorName: string;
};

export default function MerchantManagement({ initialMerchants, operatorName }: MerchantManagementProps) {
  const [merchants, setMerchants] = useState(initialMerchants);
  const [form, setForm] = useState<FormState>(() => createInitialFormState());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleChange =
    (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleSubmit = async () => {
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload: CreateMerchantInput = {
        name: form.name,
        kanaName: form.kanaName || undefined,
        companyLocation: form.companyLocation,
        storeAddressMode: form.storeAddressMode,
        storeAddressOther: form.storeAddressMode === "other" ? form.storeAddressOther : undefined,
        customerInquiryContact: form.customerInquiryContact,
        contactPersonName: form.contactPersonName,
        contactPersonPhone: form.contactPersonPhone,
        contactEmail: form.contactEmail || undefined,
        bankTransferAccount: form.bankTransferAccount || undefined,
        paymentCycle: form.paymentCycle || undefined,
      };

      const created = await createMerchant(payload);

      setMerchants((current) => [created, ...current.filter((merchant) => merchant.merchantId !== created.merchantId)]);
      setForm(createInitialFormState());
      setNotice(`提携企業「${created.name}」を登録しました。続けて「ユーザー招待」からログイン用のユーザーを追加してください。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提携企業の登録に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader title="提携企業管理" adminName={operatorName} subtitle="商品・サービスを提供する提携企業の登録と管理" />

      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faCirclePlus} className="text-cyan-600" />
          <h2 className="text-xl font-bold text-slate-900">提携企業を登録</h2>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          登録後、続けて「ユーザー招待」から提携企業のログインユーザーを追加してください。
        </p>

        {error ? (
          <Alert severity="error" className="!mt-4">
            {error}
          </Alert>
        ) : null}
        {notice ? (
          <Alert severity="success" className="!mt-4">
            {notice}
          </Alert>
        ) : null}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <TextField label="提携企業名" required fullWidth value={form.name} onChange={handleChange("name")} />
          <TextField label="フリガナ" fullWidth value={form.kanaName} onChange={handleChange("kanaName")} />
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

        <div className="mt-6 flex justify-end">
          <Button variant="contained" onClick={handleSubmit} disabled={submitting} className="!rounded-full !px-7 !py-2.5">
            {submitting ? "登録中..." : "提携企業を登録"}
          </Button>
        </div>
      </section>

      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faStore} className="text-emerald-600" />
          <h2 className="text-xl font-bold text-slate-900">登録済みの提携企業</h2>
        </div>

        {merchants.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">まだ提携企業は登録されていません。</p>
        ) : (
          <ul className="mt-5 divide-y divide-slate-200">
            {merchants.map((merchant) => (
              <li key={merchant.merchantId} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <div className="text-base font-semibold text-slate-900">{merchant.name}</div>
                  <div className="text-xs text-slate-500">
                    merchantId: {merchant.merchantId} ／ 状態: {merchant.status}
                  </div>
                </div>
                <Link
                  href={`/merchants/${encodeURIComponent(merchant.merchantId)}/users`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
                >
                  ユーザー招待
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
