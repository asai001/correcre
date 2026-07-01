"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useState } from "react";
import { Alert, Button, Checkbox, FormControlLabel, MenuItem, TextField } from "@mui/material";

import { MERCHANT_LOGIN_PATH } from "@merchant/lib/auth/constants";
import { submitRegistration } from "../api/client";
import type { SubmitMerchantRegistrationInput } from "../model/types";

const storeAddressModeOptions = [
  { value: "same_company", label: "会社と同じ" },
  { value: "no_store", label: "店舗無し" },
  { value: "other", label: "その他" },
] as const;

type FormState = {
  name: string;
  kanaName: string;
  companyLocation: string;
  storeAddressMode: SubmitMerchantRegistrationInput["storeAddressMode"];
  storeAddressOther: string;
  customerInquiryContact: string;
  contactPersonLastName: string;
  contactPersonFirstName: string;
  contactPersonLastNameKana: string;
  contactPersonFirstNameKana: string;
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
    contactPersonLastName: "",
    contactPersonFirstName: "",
    contactPersonLastNameKana: "",
    contactPersonFirstNameKana: "",
    contactPersonPhone: "",
    contactEmail: "",
    bankTransferAccount: "",
    paymentCycle: "",
  };
}

export default function RegistrationForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => createInitialFormState());
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange =
    (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitting) return;

    if (!termsAgreed) {
      setError("規約への同意が必要です。");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const contactPersonName = `${form.contactPersonLastName.trim()} ${form.contactPersonFirstName.trim()}`.trim();

      await submitRegistration({
        name: form.name,
        kanaName: form.kanaName || undefined,
        companyLocation: form.companyLocation,
        storeAddressMode: form.storeAddressMode,
        storeAddressOther: form.storeAddressMode === "other" ? form.storeAddressOther : undefined,
        customerInquiryContact: form.customerInquiryContact,
        contactPersonName,
        contactPersonPhone: form.contactPersonPhone,
        contactEmail: form.contactEmail,
        bankTransferAccount: form.bankTransferAccount || undefined,
        paymentCycle: form.paymentCycle || undefined,
        contactPersonLastName: form.contactPersonLastName,
        contactPersonFirstName: form.contactPersonFirstName,
        contactPersonLastNameKana: form.contactPersonLastNameKana || undefined,
        contactPersonFirstNameKana: form.contactPersonFirstNameKana || undefined,
        termsAgreed,
      });

      router.push("/register/complete" as Route);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録申請に失敗しました。");
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full rounded bg-white p-8">
      <h1 className="text-2xl font-bold text-slate-900">提携企業 新規会員登録</h1>
      <p className="mt-2 text-sm text-neutral-600">
        以下の項目をすべて入力し、「登録申請」ボタンを押してください。運営による審査後、登録メールアドレスに仮パスワードが届きます。
      </p>

      {error ? (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 space-y-8">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">会社情報</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="会社名" required fullWidth value={form.name} onChange={handleChange("name")} />
            <TextField label="会社名（カナ）" fullWidth value={form.kanaName} onChange={handleChange("kanaName")} />
          </div>
          <div className="flex flex-col gap-6">
            <TextField
              label="会社所在地"
              required
              fullWidth
              value={form.companyLocation}
              onChange={handleChange("companyLocation")}
            />
            <TextField
              select
              label="店舗住所"
              required
              fullWidth
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
                label="店舗住所（その他）"
                required
                fullWidth
                value={form.storeAddressOther}
                onChange={handleChange("storeAddressOther")}
              />
            ) : null}
            <TextField
              label="お客様お問い合わせ先"
              required
              fullWidth
              value={form.customerInquiryContact}
              onChange={handleChange("customerInquiryContact")}
              helperText="電話番号、メールアドレス、URL など"
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">担当者情報</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="姓"
              required
              fullWidth
              value={form.contactPersonLastName}
              onChange={handleChange("contactPersonLastName")}
            />
            <TextField
              label="名"
              required
              fullWidth
              value={form.contactPersonFirstName}
              onChange={handleChange("contactPersonFirstName")}
            />
            <TextField
              label="姓（カナ）"
              fullWidth
              value={form.contactPersonLastNameKana}
              onChange={handleChange("contactPersonLastNameKana")}
            />
            <TextField
              label="名（カナ）"
              fullWidth
              value={form.contactPersonFirstNameKana}
              onChange={handleChange("contactPersonFirstNameKana")}
            />
          </div>
          <div className="flex flex-col gap-6">
            <TextField
              label="担当者電話番号"
              required
              fullWidth
              value={form.contactPersonPhone}
              onChange={handleChange("contactPersonPhone")}
            />
            <TextField
              label="担当者メールアドレス"
              type="email"
              required
              fullWidth
              value={form.contactEmail}
              onChange={handleChange("contactEmail")}
              helperText="このメールアドレスがログインIDになります"
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">支払い情報（任意）</h2>
          <div className="flex flex-col gap-6">
            <TextField
              label="振込口座"
              fullWidth
              value={form.bankTransferAccount}
              onChange={handleChange("bankTransferAccount")}
            />
            <TextField
              label="支払サイクル"
              fullWidth
              value={form.paymentCycle}
              onChange={handleChange("paymentCycle")}
            />
          </div>
        </section>

        <div className="flex flex-col gap-3 pt-4">
          <FormControlLabel
            className="!m-0 items-start rounded border border-slate-200 bg-slate-50 px-3 py-2"
            control={
              <Checkbox
                required
                checked={termsAgreed}
                onChange={(event) => setTermsAgreed(event.target.checked)}
                className="!-ml-1 !pt-0"
              />
            }
            label={
              <span className="text-sm leading-6 text-slate-700">
                <Link
                  href={"/terms" as Route}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-700 underline-offset-2 hover:underline"
                >
                  コレクレ アイテム提携企業向け規約
                </Link>
                に同意して登録申請します。
              </span>
            }
          />
          <Button type="submit" variant="contained" color="primary" fullWidth disabled={submitting} sx={{ py: 1.5 }}>
            {submitting ? "送信中..." : "登録申請"}
          </Button>
          <Link
            href={MERCHANT_LOGIN_PATH as Route}
            className="text-center text-sm font-semibold text-blue-700 underline-offset-2 hover:underline"
          >
            ログイン画面に戻る
          </Link>
        </div>
      </form>
    </div>
  );
}
