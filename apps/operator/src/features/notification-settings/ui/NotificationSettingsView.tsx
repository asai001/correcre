"use client";

import { useState } from "react";

import AdminPageHeader from "@operator/components/AdminPageHeader";

import { saveNotificationSettings } from "../api/client";
import type { NotificationSettingsData } from "../model/types";

type Props = {
  data: NotificationSettingsData;
  operatorName: string;
};

type Feedback = {
  type: "success" | "error";
  text: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAILS = 20;

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

function sameEmails(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((email, index) => email === right[index]);
}

export default function NotificationSettingsView({ data, operatorName }: Props) {
  const [emails, setEmails] = useState<string[]>(data.operatorNotificationEmails);
  const [savedEmails, setSavedEmails] = useState<string[]>(data.operatorNotificationEmails);
  const [updatedAt, setUpdatedAt] = useState(data.updatedAt);
  const [newEmail, setNewEmail] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const isDirty = !sameEmails(emails, savedEmails);

  const handleAdd = () => {
    const candidate = newEmail.trim().toLowerCase();

    if (!candidate) {
      return;
    }
    if (!EMAIL_PATTERN.test(candidate)) {
      setInputError("メールアドレスの形式が正しくありません。");
      return;
    }
    if (emails.includes(candidate)) {
      setInputError("既に追加されています。");
      return;
    }
    if (emails.length >= MAX_EMAILS) {
      setInputError(`登録できるメールアドレスは${MAX_EMAILS}件までです。`);
      return;
    }

    setEmails((prev) => [...prev, candidate]);
    setNewEmail("");
    setInputError(null);
  };

  const handleRemove = (target: string) => {
    setEmails((prev) => prev.filter((email) => email !== target));
  };

  const handleSave = async () => {
    if (!isDirty || saving) {
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const saved = await saveNotificationSettings(emails);
      setEmails(saved.operatorNotificationEmails);
      setSavedEmails(saved.operatorNotificationEmails);
      setUpdatedAt(saved.updatedAt);
      setFeedback({
        type: "success",
        text: saved.operatorNotificationEmails.length
          ? `通知先メールアドレスを保存しました（${saved.operatorNotificationEmails.length}件）。`
          : "通知先メールアドレスを未設定に戻しました。",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "通知設定の保存に失敗しました。",
      });
    } finally {
      setSaving(false);
    }
  };

  const formattedUpdatedAt = formatUpdatedAt(updatedAt);

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        title="設定"
        adminName={operatorName}
        subtitle="運用者宛メールの送信先を管理します"
        backHref="/dashboard"
      />

      {feedback ? (
        <p
          role="status"
          className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
            feedback.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.text}
        </p>
      ) : null}

      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <h2 className="text-lg font-bold text-slate-900">通知先メールアドレス</h2>
        <p className="mt-1 text-xs text-slate-500">
          提携企業からの請求メールと、企業の管理者画面でユーザーが追加されたときの通知メールが、ここに登録したすべてのアドレスに送信されます。
          未設定の場合、請求メールは既定のアドレス、ユーザー追加通知は運用者ユーザー全員に送信されます。
        </p>

        {/* 登録済みの通知先 */}
        <div className="mt-4 max-w-xl">
          <h3 className="text-sm font-semibold text-slate-600">登録済みの通知先（{emails.length}件）</h3>
          {emails.length === 0 ? (
            <p className="mt-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-400">
              通知先メールアドレスは未設定です。
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-200">
              {emails.map((email) => (
                <li key={email} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="min-w-0 truncate text-sm text-slate-800">{email}</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(email)}
                    disabled={saving}
                    className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 追加 */}
        <div className="mt-4 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex-1">
            <input
              type="email"
              value={newEmail}
              onChange={(event) => {
                setNewEmail(event.target.value);
                setInputError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAdd();
                }
              }}
              placeholder="notify@example.com"
              aria-label="追加する通知先メールアドレス"
              className={`w-full rounded-2xl border bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 ${
                inputError ? "border-rose-400" : "border-slate-200"
              }`}
            />
            {inputError ? <p className="mt-1 text-xs font-semibold text-rose-600">{inputError}</p> : null}
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || newEmail.trim() === ""}
            className="rounded-full border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            追加
          </button>
        </div>

        {/* 保存 */}
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
    </div>
  );
}
