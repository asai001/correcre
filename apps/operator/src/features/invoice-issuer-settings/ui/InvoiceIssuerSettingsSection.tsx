"use client";

import { useState } from "react";

import { DEFAULT_INVOICE_ISSUER_NAME, type InvoiceIssuer } from "@correcre/lib/company-invoice";

import { saveInvoiceIssuerSettings } from "../api/client";
import type { InvoiceIssuerSettingsData } from "../model/types";

type Props = {
  data: InvoiceIssuerSettingsData;
};

type FormState = Record<keyof InvoiceIssuer, string>;

type Feedback = {
  type: "success" | "error";
  text: string;
};

const FIELDS: {
  key: keyof InvoiceIssuer;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  help?: string;
}[] = [
  { key: "companyName", label: "会社名（必須）", placeholder: DEFAULT_INVOICE_ISSUER_NAME },
  { key: "registrationNumber", label: "登録番号", placeholder: "T1234567890123", help: "適格請求書発行事業者の登録番号です。" },
  { key: "postalCode", label: "郵便番号", placeholder: "500-0000" },
  { key: "address", label: "住所" },
  { key: "phone", label: "電話番号" },
  { key: "email", label: "メールアドレス" },
  {
    key: "bankAccount",
    label: "お振込先",
    multiline: true,
    placeholder: "○○銀行 ○○支店 普通 1234567\nカ）エム",
  },
  { key: "note", label: "備考", multiline: true, help: "請求書の備考欄に載せる文言です（振込手数料のご負担のお願いなど）。" },
];

function toFormState(issuer: InvoiceIssuer | null): FormState {
  return {
    companyName: issuer?.companyName ?? DEFAULT_INVOICE_ISSUER_NAME,
    postalCode: issuer?.postalCode ?? "",
    address: issuer?.address ?? "",
    phone: issuer?.phone ?? "",
    email: issuer?.email ?? "",
    registrationNumber: issuer?.registrationNumber ?? "",
    bankAccount: issuer?.bankAccount ?? "",
    note: issuer?.note ?? "",
  };
}

function formatUpdatedAt(iso?: string) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function InvoiceIssuerSettingsSection({ data }: Props) {
  const [form, setForm] = useState<FormState>(() => toFormState(data.issuer));
  const [saved, setSaved] = useState<FormState>(() => toFormState(data.issuer));
  const [updatedAt, setUpdatedAt] = useState(data.updatedAt);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const isDirty = FIELDS.some(({ key }) => form[key] !== saved[key]);

  const handleSave = async () => {
    if (!isDirty || saving) {
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const result = await saveInvoiceIssuerSettings(form);
      const next = toFormState(result.issuer);
      setForm(next);
      setSaved(next);
      setUpdatedAt(result.updatedAt);
      setFeedback({ type: "success", text: "請求書の発行元情報を保存しました。" });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "請求書の発行元情報の保存に失敗しました。",
      });
    } finally {
      setSaving(false);
    }
  };

  const formattedUpdatedAt = formatUpdatedAt(updatedAt);

  return (
    <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
      <h2 className="text-lg font-bold text-slate-900">請求書の発行元情報</h2>
      <p className="mt-1 text-xs text-slate-500">
        導入企業の管理者が「請求情報」から出力する請求書に、発行元として載せる内容です。
        {data.issuer ? null : "未設定の間は、会社名だけが載った請求書になります。"}
      </p>

      {feedback ? (
        <p
          role="status"
          className={`mt-4 max-w-xl rounded-2xl px-4 py-3 text-sm font-semibold ${
            feedback.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.text}
        </p>
      ) : null}

      <div className="mt-4 grid max-w-xl gap-4">
        {FIELDS.map((field) => {
          const id = `invoice-issuer-${field.key}`;
          const className =
            "w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400";
          return (
            <div key={field.key}>
              <label htmlFor={id} className="text-sm font-semibold text-slate-600">
                {field.label}
              </label>
              {field.multiline ? (
                <textarea
                  id={id}
                  rows={3}
                  value={form[field.key]}
                  placeholder={field.placeholder}
                  onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                  className={`mt-1 ${className}`}
                />
              ) : (
                <input
                  id={id}
                  type="text"
                  value={form[field.key]}
                  placeholder={field.placeholder}
                  onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                  className={`mt-1 ${className}`}
                />
              )}
              {field.help ? <p className="mt-1 text-xs text-slate-400">{field.help}</p> : null}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex max-w-xl items-center justify-between gap-3">
        <p className="text-xs text-slate-400">
          {formattedUpdatedAt ? `最終更新: ${formattedUpdatedAt}` : null}
          {isDirty ? <span className="ml-2 font-semibold text-amber-600">未保存の変更があります</span> : null}
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {saving ? "保存中…" : "保存"}
        </button>
      </div>
    </section>
  );
}
